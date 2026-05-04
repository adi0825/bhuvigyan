import { Router } from "express";
import { db } from "@workspace/db";
import { farmers, otps, refreshTokens, udlrnMaster } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { fail, ok } from "../lib/response";
import { signFarmerAccessToken, signRefreshToken } from "../lib/jwt";
import crypto from "crypto";

const router = Router();

const DEV_OTP = "123456";
const IS_DEV = process.env["NODE_ENV"] !== "production";

async function generateOtp(mobile: string): Promise<string> {
  const code = IS_DEV ? DEV_OTP : String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await db.insert(otps).values({ mobile, code, expiresAt });
  // In production: send via Gupshup WhatsApp API
  return code;
}

// POST /api/v1/farmer/register
router.post("/register", async (req, res) => {
  const {
    mobile,
    fullName,
    stateCode,
    districtId,
    talukId,
    hobliId,
    villageId,
    surveyNumber,
    payoutAccountNo,
    payoutIfsc,
    preferredLanguage = "en",
  } = req.body as Record<string, string>;

  if (!mobile || !fullName || !stateCode || !districtId || !talukId || !hobliId || !villageId || !surveyNumber || !payoutAccountNo || !payoutIfsc) {
    return fail(res, "Missing required fields", 400);
  }

  // Check if mobile already registered
  const existing = await db.query.farmers.findFirst({ where: eq(farmers.mobile, mobile) });
  if (existing) {
    // Resend OTP
    const code = await generateOtp(mobile);
    return ok(res, { farmerId: existing.id, message: "OTP sent", ...(IS_DEV ? { devOtp: code } : {}) }, 200);
  }

  // Generate UDLRN: SS-DDDD-PPPPPP-CC
  const distCode = districtId.slice(-4).padStart(4, "0");
  const plotInput = `${surveyNumber}${villageId}${talukId}`;
  const plotHash = crypto.createHash("sha256").update(plotInput).digest("hex").slice(0, 6).toUpperCase();
  const rawUdlrn = `${stateCode}-${distCode}-${plotHash}`;
  // Luhn-style checksum (mod 97 of numeric representation)
  const numericPart = plotHash.split("").map((c) => c.charCodeAt(0) - 55).join("");
  const checksum = String(Number(numericPart.slice(-4)) % 97).padStart(2, "0");
  const udlrn = `${rawUdlrn}-${checksum}`;

  const [farmer] = await db.insert(farmers).values({
    mobile,
    fullName,
    stateCode,
    preferredLanguage,
  }).returning();

  // Create UDLRN master record
  await db.insert(udlrnMaster).values({
    udlrn,
    farmerId: farmer!.id,
    stateCode,
    districtId,
    talukId,
    hobliId,
    villageId,
    surveyNumber,
    payoutAccountNo,
    payoutIfsc,
    landUseType: "agricultural",
  });

  const code = await generateOtp(mobile);
  return ok(res, { farmerId: farmer!.id, udlrn, message: "Registration successful. OTP sent.", ...(IS_DEV ? { devOtp: code } : {}) }, 201);
});

// POST /api/v1/farmer/verify-otp
router.post("/verify-otp", async (req, res) => {
  const { mobile, otp } = req.body as { mobile: string; otp: string };
  if (!mobile || !otp) return fail(res, "mobile and otp required", 400);

  const farmer = await db.query.farmers.findFirst({ where: eq(farmers.mobile, mobile) });
  if (!farmer) return fail(res, "Farmer not found", 404);

  const otpRecord = await db.query.otps.findFirst({
    where: and(
      eq(otps.mobile, mobile),
      eq(otps.code, otp),
      gt(otps.expiresAt, new Date()),
    ),
  });

  if (!otpRecord) return fail(res, "Invalid or expired OTP", 400, "INVALID_OTP");

  // Mark OTP as used
  await db.update(otps).set({ usedAt: new Date() }).where(eq(otps.id, otpRecord.id));

  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.farmerId, farmer.id) });
  const udlrn = land?.udlrn ?? "";

  const accessToken = signFarmerAccessToken(farmer.id, udlrn, farmer.stateCode ?? "");
  const refreshToken = signRefreshToken(`farmer:${farmer.id}`);

  await db.insert(refreshTokens).values({
    farmerId: farmer.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return ok(res, {
    accessToken,
    refreshToken,
    farmer: {
      id: farmer.id,
      mobile: farmer.mobile,
      fullName: farmer.fullName,
      preferredLanguage: farmer.preferredLanguage,
      isBlacklisted: farmer.isBlacklisted,
    },
    udlrn,
  });
});

// POST /api/v1/farmer/login
router.post("/login", async (req, res) => {
  const { mobile } = req.body as { mobile: string };
  if (!mobile) return fail(res, "mobile required", 400);

  const farmer = await db.query.farmers.findFirst({ where: eq(farmers.mobile, mobile) });
  if (!farmer) return fail(res, "Farmer not registered", 404);
  if (farmer.isBlacklisted) return fail(res, "Account suspended", 403, "BLACKLISTED");

  const code = await generateOtp(mobile);
  return ok(res, { message: "OTP sent to WhatsApp", ...(IS_DEV ? { devOtp: code } : {}) });
});

export default router;
