import { Router } from "express";
import { db } from "@workspace/db";
import { claims, cscOperators, fraudHeatmapDaily, auditLog } from "@workspace/db";
import { gte, desc, sql, count, avg } from "drizzle-orm";
import { ok } from "../lib/response";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// GET /api/v1/analytics/fraud-trends?window=7d|30d|90d
router.get("/fraud-trends", requireAdmin, async (req, res) => {
  const window = (req.query["window"] as string) ?? "30d";
  const days = window === "7d" ? 7 : window === "90d" ? 90 : 30;
  const since = new Date(Date.now() - days * 86400000);

  const allClaims = await db.query.claims.findMany({
    where: gte(claims.filedAt, since),
    orderBy: [desc(claims.filedAt)],
  });

  // Group by day
  const buckets: Record<string, { date: string; claims: number; highRisk: number; totalScore: number; scored: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0]!;
    buckets[d] = { date: d, claims: 0, highRisk: 0, totalScore: 0, scored: 0 };
  }

  allClaims.forEach((c) => {
    const d = new Date(c.filedAt!).toISOString().split("T")[0]!;
    if (buckets[d]) {
      buckets[d].claims++;
      const score = Number(c.fraudScore ?? -1);
      if (score >= 0) { buckets[d].totalScore += score; buckets[d].scored++; }
      if (score > 70) buckets[d].highRisk++;
    }
  });

  const timeSeries = Object.values(buckets).map((b) => ({
    date: b.date,
    claims: b.claims,
    highRisk: b.highRisk,
    avgScore: b.scored > 0 ? Number((b.totalScore / b.scored).toFixed(1)) : null,
  }));

  // State breakdown
  const stateGroups: Record<string, { state: string; claims: number; highRisk: number; avgScore: number; scoreSum: number; scored: number }> = {};
  allClaims.forEach((c) => {
    const s = c.stateCode ?? "UNK";
    if (!stateGroups[s]) stateGroups[s] = { state: s, claims: 0, highRisk: 0, avgScore: 0, scoreSum: 0, scored: 0 };
    stateGroups[s].claims++;
    const score = Number(c.fraudScore ?? -1);
    if (score >= 0) { stateGroups[s].scoreSum += score; stateGroups[s].scored++; }
    if (score > 70) stateGroups[s].highRisk++;
  });
  const stateBreakdown = Object.values(stateGroups).map((s) => ({
    state: s.state,
    claims: s.claims,
    highRisk: s.highRisk,
    avgScore: s.scored > 0 ? Number((s.scoreSum / s.scored).toFixed(1)) : 0,
    fraudRate: s.claims > 0 ? Number(((s.highRisk / s.claims) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.fraudRate - a.fraudRate);

  // Score distribution
  const bands = [
    { band: "Low (0–30)", count: 0 },
    { band: "Medium (31–60)", count: 0 },
    { band: "High (61–80)", count: 0 },
    { band: "Critical (81–100)", count: 0 },
  ];
  allClaims.forEach((c) => {
    const s = Number(c.fraudScore ?? -1);
    if (s < 0) return;
    if (s <= 30) bands[0].count++;
    else if (s <= 60) bands[1].count++;
    else if (s <= 80) bands[2].count++;
    else bands[3].count++;
  });

  const totalClaims = allClaims.length;
  const highRiskTotal = allClaims.filter((c) => Number(c.fraudScore ?? 0) > 70).length;
  const avgScore = totalClaims > 0
    ? allClaims.reduce((s, c) => s + Number(c.fraudScore ?? 0), 0) / totalClaims : 0;

  return ok(res, {
    window,
    days,
    timeSeries,
    stateBreakdown,
    scoreDistribution: bands,
    summary: {
      totalClaims,
      highRiskCount: highRiskTotal,
      highRiskRate: totalClaims > 0 ? Number(((highRiskTotal / totalClaims) * 100).toFixed(1)) : 0,
      avgFraudScore: Number(avgScore.toFixed(1)),
    },
  });
});

// GET /api/v1/analytics/operator-risk?operatorId=
router.get("/operator-risk", requireAdmin, async (req, res) => {
  const { operatorId } = req.query as Record<string, string>;

  const allClaims = await db.query.claims.findMany({
    orderBy: [desc(claims.filedAt)],
    limit: 500,
  });

  const operatorMap: Record<string, {
    operatorId: string; name: string; state: string;
    total: number; highRisk: number; autoRejected: number; scoreSum: number; scored: number;
  }> = {};

  allClaims.forEach((c) => {
    if (!c.cscOperatorId) return;
    if (operatorId && c.cscOperatorId !== operatorId) return;
    if (!operatorMap[c.cscOperatorId]) {
      operatorMap[c.cscOperatorId] = {
        operatorId: c.cscOperatorId,
        name: `CSC-${c.cscOperatorId.slice(0, 8)}`,
        state: c.stateCode ?? "—",
        total: 0, highRisk: 0, autoRejected: 0, scoreSum: 0, scored: 0,
      };
    }
    const op = operatorMap[c.cscOperatorId];
    op.total++;
    const score = Number(c.fraudScore ?? -1);
    if (score >= 0) { op.scoreSum += score; op.scored++; }
    if (score > 70) op.highRisk++;
    if (["REJECTED_FRAUD", "AUTO_REJECTED"].includes(c.status)) op.autoRejected++;
  });

  const operators = await db.query.cscOperators.findMany({ limit: 100 });
  operators.forEach((op) => {
    if (operatorMap[op.id]) {
      operatorMap[op.id].name = op.name ?? operatorMap[op.id].name;
      operatorMap[op.id].state = op.stateCode ?? operatorMap[op.id].state;
    }
  });

  const result = Object.values(operatorMap).map((op) => ({
    operatorId: op.operatorId,
    name: op.name,
    state: op.state,
    totalClaims: op.total,
    highRiskClaims: op.highRisk,
    autoRejectedClaims: op.autoRejected,
    avgFraudScore: op.scored > 0 ? Number((op.scoreSum / op.scored).toFixed(1)) : 0,
    fraudRate: op.total > 0 ? Number(((op.highRisk / op.total) * 100).toFixed(1)) : 0,
    riskLevel: op.highRisk / Math.max(op.total, 1) > 0.4 ? "HIGH" :
               op.highRisk / Math.max(op.total, 1) > 0.2 ? "MEDIUM" : "LOW",
  })).sort((a, b) => b.fraudRate - a.fraudRate);

  return ok(res, operatorId ? result[0] ?? null : result);
});

// GET /api/v1/analytics/dashboard
router.get("/dashboard", requireAdmin, async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const allClaims = await db.query.claims.findMany({ orderBy: [desc(claims.filedAt)], limit: 1000 });
  const recentClaims = allClaims.filter((c) => new Date(c.filedAt!) >= thirtyDaysAgo);

  const approved = allClaims.filter((c) => ["APPROVED", "AUTO_APPROVED"].includes(c.status)).length;
  const rejected = allClaims.filter((c) => ["REJECTED", "REJECTED_FRAUD", "AUTO_REJECTED"].includes(c.status)).length;
  const pending = allClaims.filter((c) => ["FILED", "OFFICER_REVIEW", "CCE_VISIT", "LAND_VERIFIED"].includes(c.status)).length;

  const heatmap = await db.query.fraudHeatmapDaily.findMany({ limit: 20 });

  return ok(res, {
    totalClaims: allClaims.length,
    approvedClaims: approved,
    rejectedClaims: rejected,
    pendingClaims: pending,
    autoApprovalRate: allClaims.length > 0 ? Number(((approved / allClaims.length) * 100).toFixed(1)) : 0,
    fraudDetectionRate: allClaims.length > 0 ? Number(((rejected / allClaims.length) * 100).toFixed(1)) : 0,
    last30DaysClaims: recentClaims.length,
    districtHeatmap: heatmap.map((h) => ({
      districtId: h.districtId,
      fraudRate: Number(h.fraudRate ?? 0) / 100,
      totalClaims: h.totalClaims ?? 0,
    })),
  });
});

export default router;
