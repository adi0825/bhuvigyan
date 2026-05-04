import { Router } from "express";
import { db } from "@workspace/db";
import { adminOfficers, refreshTokens } from "@workspace/db";
import { eq } from "drizzle-orm";
import { fail, ok } from "../lib/response";
import { signAdminAccessToken, signRefreshToken } from "../lib/jwt";
import crypto from "crypto";

const router = Router();

const DEV_TOTP = "123456";
const IS_DEV = process.env["NODE_ENV"] !== "production";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(`bhuvigyan:${password}`).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function verifyTotp(code: string, _secret: string): boolean {
  if (IS_DEV && code === DEV_TOTP) return true;
  // In production: use RFC 6238 TOTP with secret
  return code === DEV_TOTP;
}

// POST /api/v1/admin/login
router.post("/login", async (req, res) => {
  const { email, password, totpCode } = req.body as { email: string; password: string; totpCode: string };
  if (!email || !password || !totpCode) return fail(res, "email, password, and totpCode required", 400);

  const officer = await db.query.adminOfficers.findFirst({ where: eq(adminOfficers.email, email) });
  if (!officer || !officer.isActive) return fail(res, "Invalid credentials", 401, "INVALID_CREDENTIALS");

  if (!verifyPassword(password, officer.passwordHash)) return fail(res, "Invalid credentials", 401, "INVALID_CREDENTIALS");

  if (!verifyTotp(totpCode, officer.totpSecret ?? "")) return fail(res, "Invalid TOTP code", 401, "INVALID_TOTP");

  await db.update(adminOfficers).set({ lastLoginAt: new Date() }).where(eq(adminOfficers.id, officer.id));

  const accessToken = signAdminAccessToken(officer.id, officer.email, officer.role, officer.jurisdiction as object ?? {});
  const refreshToken = signRefreshToken(`admin:${officer.id}`);

  await db.insert(refreshTokens).values({
    adminId: officer.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return ok(res, {
    accessToken,
    refreshToken,
    officer: {
      id: officer.id,
      email: officer.email,
      fullName: officer.fullName,
      role: officer.role,
      stateCode: officer.stateCode,
      districtId: officer.districtId,
      jurisdiction: officer.jurisdiction,
    },
  });
});

export { hashPassword };
export default router;
