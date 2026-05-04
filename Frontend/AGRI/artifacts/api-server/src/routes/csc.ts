import { Router } from "express";
import { db } from "@workspace/db";
import { cscOperators, claims, udlrnMaster, farmers, auditLog, udlrnSeasonLock } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { fail, ok } from "../lib/response";
import { signAccessToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { processClaim } from "../lib/claim-pipeline";
import type { Request, Response, NextFunction } from "express";

const router = Router();

function requireCsc(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "CSC_OPERATOR") {
      fail(res, "CSC access only", 403, "FORBIDDEN");
      return;
    }
    next();
  });
}

function generateClaimNumber(): string {
  const now = new Date();
  const yr = now.getFullYear().toString().slice(-2);
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
  return `PMFBY${yr}${mo}${rand}`;
}

// POST /api/v1/csc/auth/pre-login
router.post("/auth/pre-login", async (req, res) => {
  const { operatorCode, password } = req.body as { operatorCode: string; password: string };
  if (!operatorCode || !password) return fail(res, "operatorCode and password required", 400);

  const op = await db.query.cscOperators.findFirst({ where: eq(cscOperators.cscId, operatorCode) });
  if (!op) return fail(res, "Operator not found", 404);

  const DEV_MODE = process.env.NODE_ENV !== "production";
  if (!DEV_MODE && password !== "Csc@123") return fail(res, "Invalid credentials", 401);

  return ok(res, { requiresOtp: true });
});

// POST /api/v1/csc/auth/login
router.post("/auth/login", async (req, res) => {
  const { operatorCode, password, otp } = req.body as { operatorCode: string; password: string; otp: string };
  if (!operatorCode || !otp) return fail(res, "operatorCode and otp required", 400);

  const DEV_MODE = process.env.NODE_ENV !== "production";
  if (!DEV_MODE && otp !== "123456") return fail(res, "Invalid OTP", 401);
  if (DEV_MODE && otp !== "123456") return fail(res, "DEV MODE: Use OTP 123456", 401);

  const op = await db.query.cscOperators.findFirst({ where: eq(cscOperators.cscId, operatorCode) });
  if (!op) return fail(res, "Operator not found", 404);

  const token = signAccessToken({ sub: op.id, role: "CSC_OPERATOR", cscId: op.id });
  return ok(res, {
    token,
    operator: {
      id: op.id, fullName: op.name, operatorCode: op.cscId,
      districtId: op.districtId, isBlocked: op.isBlocked,
    },
  });
});

// GET /api/v1/csc/dashboard
router.get("/dashboard", requireCsc, async (req, res) => {
  const cscId = req.auth!.cscId!;
  const op = await db.query.cscOperators.findFirst({ where: eq(cscOperators.id, cscId) });
  if (!op) return fail(res, "Not found", 404);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayClaimsRaw = await db.query.claims.findMany({
    where: and(eq(claims.cscOperatorId, cscId), gte(claims.filedAt, today)),
  });
  const allClaims = await db.query.claims.findMany({
    where: eq(claims.cscOperatorId, cscId),
    orderBy: (c, { desc }) => [desc(c.filedAt)],
    limit: 5,
  });

  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const weekClaims = await db.query.claims.findMany({
    where: and(eq(claims.cscOperatorId, cscId), gte(claims.filedAt, weekAgo)),
  });

  return ok(res, {
    todayCount: todayClaimsRaw.length,
    weekCount: weekClaims.length,
    totalCount: op.totalClaims ?? 0,
    fraudFlaggedCount: op.fraudFlagCount ?? 0,
    recentClaims: allClaims.map((c) => ({
      id: c.id, claimNumber: c.claimNumber, status: c.status,
      declaredCrop: c.declaredCrop, filedAt: c.filedAt, fraudFlags: c.fraudFlags,
      udlrn: c.udlrn, damageType: c.damageType,
    })),
  });
});

// GET /api/v1/csc/farmer-lookup
router.get("/farmer-lookup", requireCsc, async (req, res) => {
  const q = String(req.query["q"] ?? "").trim();
  if (!q) return fail(res, "Search query required", 400);

  const isUdlrn = /^\d{2}-/.test(q);

  let land: typeof udlrnMaster.$inferSelect | null | undefined = null;
  let farmer: typeof farmers.$inferSelect | null | undefined = null;

  if (isUdlrn) {
    land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, q) });
    if (land?.farmerId) farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, land.farmerId) });
  } else {
    farmer = await db.query.farmers.findFirst({ where: eq(farmers.mobile, q) });
    if (farmer) land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.farmerId, farmer.id) });
  }

  if (!land || !farmer) return fail(res, "Farmer or land record not found", 404);

  return ok(res, {
    udlrn: land.udlrn,
    farmerId: farmer.id,
    fullName: farmer.fullName,
    mobile: farmer.mobile,
    landOwnerName: land.landOwnerName,
    landAreaHa: land.kgisAreaHa ?? land.rtcAreaHa,
    surveyNumber: land.surveyNumber,
    stateCode: land.stateCode,
    isFrozen: land.isFrozen,
    frozenReason: land.frozenReason,
    isBlacklisted: farmer.isBlacklisted,
    carbonEligible: farmer.carbonEligible,
  });
});

// GET /api/v1/csc/my-claims
router.get("/my-claims", requireCsc, async (req, res) => {
  const cscId = req.auth!.cscId!;
  const claimList = await db.query.claims.findMany({
    where: eq(claims.cscOperatorId, cscId),
    orderBy: (c, { desc }) => [desc(c.filedAt)],
    limit: 50,
  });
  return ok(res, claimList.map((c) => ({
    id: c.id, claimNumber: c.claimNumber, udlrn: c.udlrn,
    declaredCrop: c.declaredCrop, damageType: c.damageType,
    status: c.status, fraudScore: c.fraudScore, filedAt: c.filedAt,
    fraudFlags: c.fraudFlags,
  })));
});

// POST /api/v1/csc/file-claim
router.post("/file-claim", requireCsc, async (req, res) => {
  const cscId = req.auth!.cscId!;
  const op = await db.query.cscOperators.findFirst({ where: eq(cscOperators.id, cscId) });
  if (!op) return fail(res, "Operator not found", 404);
  if (op.isBlocked) return fail(res, "Operator account is blocked. Contact admin.", 403);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayClaims = await db.query.claims.findMany({
    where: and(eq(claims.cscOperatorId, cscId), gte(claims.filedAt, today)),
  });
  if (todayClaims.length >= 50) return fail(res, "Daily filing quota reached (50/day). Try again tomorrow.", 429);

  const {
    udlrn, declaredCrop, damageType, sowingDate, damageDate,
    claimAmountRequested, season, seasonType, insurerCode,
  } = req.body as Record<string, string>;

  if (!udlrn || !declaredCrop || !damageType || !sowingDate || !damageDate || !claimAmountRequested || !season || !seasonType) {
    return fail(res, "Missing required fields: udlrn, declaredCrop, damageType, sowingDate, damageDate, claimAmountRequested, season, seasonType", 400);
  }

  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, udlrn) });
  if (!land) return fail(res, "UDLRN not found in records", 404);
  if (land.isFrozen) return fail(res, `UDLRN is frozen: ${land.frozenReason ?? "under investigation"}`, 403);

  const farmer = land.farmerId
    ? await db.query.farmers.findFirst({ where: eq(farmers.id, land.farmerId) })
    : null;
  if (!farmer) return fail(res, "No registered farmer linked to this UDLRN", 404);
  if (farmer.isBlacklisted) return fail(res, "Farmer is blacklisted — cannot file claims", 403);

  const seasonCode = `${season}-${seasonType}`;
  const existingLock = await db.query.udlrnSeasonLock.findFirst({
    where: and(eq(udlrnSeasonLock.udlrn, udlrn), eq(udlrnSeasonLock.seasonCode, seasonCode)),
  });
  if (existingLock) return fail(res, "A claim already exists for this UDLRN and season. Duplicate filing blocked.", 409);

  const claimNumber = generateClaimNumber();

  const [claim] = await db.insert(claims).values({
    claimNumber,
    udlrn,
    farmerId: farmer.id,
    season,
    seasonType,
    damageType,
    damageDate,
    declaredSowingDate: sowingDate,
    declaredCrop,
    claimAmountRequested: String(claimAmountRequested),
    insurerCode: insurerCode || undefined,
    cscOperatorId: cscId,
    status: "FILED",
    pipelineStage: "INGESTION",
  }).returning();

  if (!claim) return fail(res, "Failed to create claim record", 500);

  await db.insert(udlrnSeasonLock).values({
    udlrn,
    seasonCode,
    claimId: claim.id,
  }).onConflictDoNothing();

  await db.insert(auditLog).values({
    claimId: claim.id,
    stepName: "CSC_FILED",
    actorId: cscId,
    actorType: "CSC_OPERATOR",
    decisionReason: `Filed via CSC portal by ${op.name} (${op.cscId}). Crop: ${declaredCrop}, Damage: ${damageType}`,
    outputSnapshot: { udlrn, declaredCrop, damageType, season, seasonType },
  });

  processClaim(claim.id).catch((err: unknown) => {
    console.error(`[CSC] Pipeline start failed for claim ${claim.id}:`, err);
  });

  return ok(res, {
    claimId: claim.id,
    claimNumber: claim.claimNumber,
    message: "Claim filed successfully. AI pipeline started.",
  });
});

export default router;
