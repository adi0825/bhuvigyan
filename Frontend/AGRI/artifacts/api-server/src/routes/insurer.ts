import { Router } from "express";
import { db } from "@workspace/db";
import { insurerAccounts, claims, cscOperators, fraudHeatmapDaily } from "@workspace/db";
import { eq, and, gte, lte, count, sum, sql, desc, ilike, or } from "drizzle-orm";
import { fail, ok } from "../lib/response";
import { signAccessToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const router = Router();

function requireInsurer(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "INSURER") {
      fail(res, "Insurer access only", 403, "FORBIDDEN");
      return;
    }
    next();
  });
}

// POST /api/v1/insurer/auth/login
router.post("/auth/login", async (req, res) => {
  const { insurerCode, password } = req.body as { insurerCode: string; password: string };
  if (!insurerCode || !password) return fail(res, "insurerCode and password required", 400);

  const ins = await db.query.insurerAccounts.findFirst({ where: eq(insurerAccounts.insurerCode, insurerCode) });
  if (!ins) return fail(res, "Insurer not found", 404);

  const DEV_MODE = process.env.NODE_ENV !== "production";
  if (!DEV_MODE) {
    const hash = crypto.createHash("sha256").update(`bhuvigyan:${password}`).digest("hex");
    if (hash !== ins.passwordHash) return fail(res, "Invalid credentials", 401);
  }

  const token = signAccessToken({ sub: ins.id, role: "INSURER", insurerCode: ins.insurerCode });
  return ok(res, {
    token,
    insurer: {
      id: ins.id, insurerCode: ins.insurerCode, insurerName: ins.insurerName,
    },
  });
});

// GET /api/v1/insurer/dashboard
router.get("/dashboard", requireInsurer, async (req, res) => {
  const insurerCode = req.auth!.insurerCode!;

  const allClaims = await db.query.claims.findMany({
    where: eq(claims.insurerCode, insurerCode),
    orderBy: (c, { desc }) => [desc(c.filedAt)],
    limit: 100,
  });

  const approved = allClaims.filter((c) => ["APPROVED", "AUTO_APPROVED"].includes(c.status));
  const rejected = allClaims.filter((c) => ["REJECTED", "REJECTED_FRAUD", "AUTO_REJECTED"].includes(c.status));
  const pending = allClaims.filter((c) => ["FILED", "OFFICER_REVIEW", "CCE_VISIT", "LAND_VERIFIED"].includes(c.status));

  const totalApproved = approved.reduce((s, c) => s + Number(c.approvedAmount ?? 0), 0);
  const totalRequested = rejected.reduce((s, c) => s + Number(c.claimAmountRequested ?? 0), 0);
  const fraudRate = allClaims.length > 0 ? rejected.length / allClaims.length : 0;

  // Weekly trend (last 7 days)
  const days: Record<string, { date: string; claims: number; approved: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0]!;
    days[d] = { date: d, claims: 0, approved: 0 };
  }
  allClaims.forEach((c) => {
    const d = new Date(c.filedAt!).toISOString().split("T")[0]!;
    if (days[d]) {
      days[d].claims++;
      if (["APPROVED", "AUTO_APPROVED"].includes(c.status)) days[d].approved++;
    }
  });

  return ok(res, {
    totalClaims: allClaims.length,
    approvedClaims: approved.length,
    rejectedClaims: rejected.length,
    pendingClaims: pending.length,
    totalApprovedAmount: totalApproved,
    totalSaved: totalRequested,
    fraudRate,
    weeklyTrend: Object.values(days),
    recentClaims: allClaims.slice(0, 10).map((c) => ({
      id: c.id, claimNumber: c.claimNumber, udlrn: c.udlrn,
      status: c.status, declaredCrop: c.declaredCrop,
      approvedAmount: c.approvedAmount, fraudScore: c.fraudScore, filedAt: c.filedAt,
    })),
  });
});

// GET /api/v1/insurer/claims
router.get("/claims", requireInsurer, async (req, res) => {
  const insurerCode = req.auth!.insurerCode!;
  const allClaims = await db.query.claims.findMany({
    where: eq(claims.insurerCode, insurerCode),
    orderBy: (c, { desc }) => [desc(c.filedAt)],
  });
  return ok(res, allClaims.map((c) => ({
    id: c.id, claimNumber: c.claimNumber, udlrn: c.udlrn,
    status: c.status, declaredCrop: c.declaredCrop,
    fraudScore: c.fraudScore, claimAmountRequested: c.claimAmountRequested,
    approvedAmount: c.approvedAmount, filedAt: c.filedAt,
  })));
});

// GET /api/v1/insurer/analytics
router.get("/analytics", requireInsurer, async (req, res) => {
  const insurerCode = req.auth!.insurerCode!;

  const allClaims = await db.query.claims.findMany({
    where: eq(claims.insurerCode, insurerCode),
    orderBy: (c, { desc }) => [desc(c.filedAt)],
  });

  // Score distribution
  const bands = [
    { band: "Low (0-30)", min: 0, max: 30 },
    { band: "Medium (31-60)", min: 31, max: 60 },
    { band: "High (61-80)", min: 61, max: 80 },
    { band: "Critical (81-100)", min: 81, max: 100 },
  ];
  const scoreDist = bands.map((b) => ({
    band: b.band,
    count: allClaims.filter((c) => {
      const s = Number(c.fraudScore ?? -1);
      return s >= b.min && s <= b.max;
    }).length,
  }));

  // Monthly time series (last 6 months)
  const months: Record<string, { month: string; avgScore: number; claims: number; totalScore: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    months[key] = { month: label, avgScore: 0, claims: 0, totalScore: 0 };
  }
  allClaims.forEach((c) => {
    const key = new Date(c.filedAt!).toISOString().slice(0, 7);
    if (months[key]) {
      months[key].claims++;
      months[key].totalScore += Number(c.fraudScore ?? 0);
    }
  });
  const timeSeries = Object.values(months).map((m) => ({
    month: m.month,
    avgScore: m.claims > 0 ? Number((m.totalScore / m.claims).toFixed(1)) : 0,
    claims: m.claims,
  }));

  // CSC leaderboard
  const cscClaims: Record<string, { operatorId: string; name: string; state: string; total: number; fraud: number }> = {};
  allClaims.forEach((c) => {
    if (!c.cscOperatorId) return;
    if (!cscClaims[c.cscOperatorId]) {
      cscClaims[c.cscOperatorId] = { operatorId: c.cscOperatorId, name: c.cscOperatorId.slice(0, 8), state: c.stateCode ?? "—", total: 0, fraud: 0 };
    }
    cscClaims[c.cscOperatorId].total++;
    if (Number(c.fraudScore ?? 0) > 60) cscClaims[c.cscOperatorId].fraud++;
  });
  const cscLeaderboard = Object.values(cscClaims)
    .map((op) => ({ ...op, fraudRate: op.total > 0 ? op.fraud / op.total : 0, totalClaims: op.total }))
    .sort((a, b) => b.fraudRate - a.fraudRate)
    .slice(0, 10);

  // District heatmap from fraud_heatmap_daily
  const heatmap = await db.query.fraudHeatmapDaily.findMany({ limit: 20 });
  const districtHeatmap = heatmap.map((h) => ({
    districtId: h.districtId,
    fraudRate: Number(h.fraudRate ?? 0) / 100,
    totalClaims: h.totalClaims ?? 0,
  })).sort((a, b) => b.fraudRate - a.fraudRate);

  const highRisk = allClaims.filter((c) => Number(c.fraudScore ?? 0) > 70).length;
  const avgScore = allClaims.length > 0 ? allClaims.reduce((s, c) => s + Number(c.fraudScore ?? 0), 0) / allClaims.length : 0;
  const flaggedAmount = allClaims.filter((c) => Number(c.fraudScore ?? 0) > 60)
    .reduce((s, c) => s + Number(c.claimAmountRequested ?? 0), 0);

  return ok(res, {
    timeSeries,
    scoreDistribution: scoreDist,
    cscLeaderboard,
    districtHeatmap,
    summary: { highRiskCount: highRisk, avgFraudScore: Number(avgScore.toFixed(1)), totalFlaggedAmount: flaggedAmount },
  });
});

// GET /api/v1/insurer/claims/:id — individual claim detail for insurer (spec 3.4 / 10.4)
router.get("/claims/:id", requireInsurer, async (req, res) => {
  const { id } = req.params;
  const claim = await db.query.claims.findFirst({ where: eq(claims.id, id) });
  if (!claim) return fail(res, "Claim not found", 404);

  const scoreBand = !claim.fraudScore ? null :
    Number(claim.fraudScore) <= 30 ? "LOW" :
    Number(claim.fraudScore) <= 60 ? "MEDIUM" :
    Number(claim.fraudScore) <= 80 ? "HIGH" : "CRITICAL";

  return ok(res, {
    id: claim.id,
    claimNumber: claim.claimNumber,
    udlrn: claim.udlrn,
    stateCode: claim.stateCode,
    status: claim.status,
    verdict: claim.verdict,
    declaredCrop: claim.declaredCrop,
    damageType: claim.damageType,
    season: claim.season,
    seasonType: claim.seasonType,
    claimAmountRequested: claim.claimAmountRequested,
    approvedAmount: claim.approvedAmount,
    fraudScore: claim.fraudScore,
    scoreBand,
    modelVersion: claim.modelVersion,
    ndviSowing: claim.ndviSowing,
    ndviClaim: claim.ndviClaim,
    ndviLossPct: claim.ndviLossPct,
    trueColorUrl: claim.trueColorUrl,
    ndviMapUrl: claim.ndviMapUrl,
    lossMapUrl: claim.lossMapUrl,
    dataSource: claim.dataSource,
    filedAt: claim.filedAt,
    decidedAt: claim.decidedAt,
    rejectionReason: claim.rejectionReason,
    insurerCode: claim.insurerCode,
    farmerName: claim.farmerName,
    cscOperatorId: claim.cscOperatorId,
  });
});

// GET /api/v1/insurer/evidence/:claimId — evidence package for insurer (spec 10.4)
router.get("/evidence/:claimId", requireInsurer, async (_req, res) => {
  return ok(res, { message: "Use /v1/evidence/:claimId for evidence packages" });
});

export default router;
