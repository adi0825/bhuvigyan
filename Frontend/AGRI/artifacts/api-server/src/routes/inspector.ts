import { Router } from "express";
import { db } from "@workspace/db";
import {
  adminOfficers, cceVisits, claims, udlrnMaster, farmers, auditLog, notifications,
  fraudHeatmapDaily, cscOperators,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { fail, ok } from "../lib/response";
import { signAccessToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import type { Request, Response, NextFunction } from "express";

const router = Router();

function requireInspector(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!["FIELD_INSPECTOR", "SUPER_ADMIN"].includes(req.auth?.role ?? "")) {
      fail(res, "Inspector access only", 403, "FORBIDDEN");
      return;
    }
    next();
  });
}

// POST /api/v1/inspector/auth/request-otp
router.post("/auth/request-otp", async (req, res) => {
  const { email } = req.body as { email: string };
  const officer = await db.query.adminOfficers.findFirst({ where: eq(adminOfficers.email, email) });
  if (!officer) return fail(res, "Officer not found", 404);
  // Dev mode: OTP always 123456
  return ok(res, { message: "OTP sent (DEV: use 123456)" });
});

// POST /api/v1/inspector/auth/login
router.post("/auth/login", async (req, res) => {
  const { email, otp } = req.body as { email: string; otp: string };
  if (otp !== "123456") return fail(res, "Invalid OTP (DEV: use 123456)", 401);

  const officer = await db.query.adminOfficers.findFirst({ where: eq(adminOfficers.email, email) });
  if (!officer) return fail(res, "Officer not found", 404);

  const token = signAccessToken({
    sub: officer.id, role: officer.role, adminId: officer.id,
    email: officer.email, state: officer.stateCode ?? undefined,
    jurisdiction: { districtId: officer.districtId },
  });

  return ok(res, {
    token,
    inspector: {
      id: officer.id, fullName: officer.fullName, email: officer.email,
      role: officer.role, stateCode: officer.stateCode, districtId: officer.districtId,
    },
  });
});

// GET /api/v1/inspector/assignments
router.get("/assignments", requireInspector, async (req, res) => {
  const inspectorId = req.auth!.adminId!;

  const visits = await db.query.cceVisits.findMany({
    where: and(eq(cceVisits.inspectorId, inspectorId), eq(cceVisits.status, "ASSIGNED")),
  });

  const results = await Promise.all(visits.map(async (v) => {
    const claim = v.claimId ? await db.query.claims.findFirst({ where: eq(claims.id, v.claimId) }) : null;
    const land = claim?.udlrn ? await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, claim.udlrn) }) : null;
    const farmer = claim?.farmerId ? await db.query.farmers.findFirst({ where: eq(farmers.id, claim.farmerId) }) : null;

    return {
      id: v.id,
      claimId: claim?.id,
      claimNumber: claim?.claimNumber,
      udlrn: claim?.udlrn,
      farmerName: farmer?.fullName,
      declaredCrop: claim?.declaredCrop,
      damageType: claim?.damageType,
      centroidLat: land?.centroidLat,
      centroidLng: land?.centroidLng,
      status: v.status,
      priority: v.priority,
      dueBy: v.dueBy,
      ndviSowing: claim?.ndviSowing,
      ndviClaim: claim?.ndviClaim,
    };
  }));

  return ok(res, results);
});

// GET /api/v1/inspector/visit/:id
router.get("/visit/:id", requireInspector, async (req, res) => {
  const visit = await db.query.cceVisits.findFirst({ where: eq(cceVisits.id, req.params["id"]!) });
  if (!visit) return fail(res, "Visit not found", 404);

  const claim = visit.claimId ? await db.query.claims.findFirst({ where: eq(claims.id, visit.claimId) }) : null;
  const land = claim?.udlrn ? await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, claim.udlrn) }) : null;
  const farmer = claim?.farmerId ? await db.query.farmers.findFirst({ where: eq(farmers.id, claim.farmerId) }) : null;

  return ok(res, {
    id: visit.id,
    claimId: claim?.id,
    claimNumber: claim?.claimNumber,
    udlrn: claim?.udlrn,
    status: visit.status,
    priority: visit.priority,
    dueBy: visit.dueBy,
    farmerName: farmer?.fullName,
    damageType: claim?.damageType,
    declaredCrop: claim?.declaredCrop,
    centroidLat: land?.centroidLat,
    centroidLng: land?.centroidLng,
    ndviSowing: claim?.ndviSowing,
    ndviClaim: claim?.ndviClaim,
  });
});

// POST /api/v1/inspector/visit/:id/submit
router.post("/visit/:id/submit", requireInspector, async (req, res) => {
  const { verdict, notes, cropCondition, estimatedLossPct, gpsLat, gpsLng, photosCount } = req.body as Record<string, string | number>;
  if (!verdict || !notes) return fail(res, "verdict and notes required", 400);

  const visit = await db.query.cceVisits.findFirst({ where: eq(cceVisits.id, req.params["id"]!) });
  if (!visit) return fail(res, "Visit not found", 404);

  await db.update(cceVisits).set({
    status: "COMPLETED",
    visitedAt: new Date(),
    cceVerdict: String(verdict),
    inspectorNotes: String(notes),
    actualCropCondition: cropCondition ? String(cropCondition) : undefined,
    gpsCheckinLat: gpsLat ? String(gpsLat) : undefined,
    gpsCheckinLng: gpsLng ? String(gpsLng) : undefined,
    photoUrls: photosCount ? Array.from({ length: Number(photosCount) }, (_, i) => `photo_${i + 1}.jpg`) : [],
  }).where(eq(cceVisits.id, req.params["id"]!));

  // Update claim status based on verdict
  if (visit.claimId) {
    const newStatus = verdict === "NO_DAMAGE" ? "REJECTED" : "OFFICER_REVIEW";
    await db.update(claims).set({ status: newStatus, pipelineStage: "CCE_COMPLETED" }).where(eq(claims.id, visit.claimId));

    await db.insert(auditLog).values({
      claimId: visit.claimId,
      stepName: "CCE_COMPLETED",
      actorId: req.auth!.adminId ?? "",
      actorType: "FIELD_INSPECTOR",
      decisionReason: `CCE verdict: ${verdict}. ${notes}`,
      outputSnapshot: { verdict, estimatedLossPct, photosCount },
    });
  }

  return ok(res, { message: "CCE visit submitted successfully" });
});

// GET /api/v1/inspector/analytics
router.get("/analytics", requireInspector, async (req, res) => {
  const inspectorId = req.auth!.adminId!;

  // All visits for this inspector
  const allVisits = await db.query.cceVisits.findMany({
    where: eq(cceVisits.inspectorId, inspectorId),
    orderBy: [desc(cceVisits.assignedAt)],
  });

  const completed = allVisits.filter((v) => v.status === "COMPLETED").length;
  const pending = allVisits.filter((v) => v.status === "ASSIGNED").length;

  // Get all claims linked to visits for scoring
  const claimIds = allVisits.map((v) => v.claimId).filter(Boolean) as string[];
  const relatedClaims = claimIds.length > 0
    ? await Promise.all(claimIds.slice(0, 50).map((id) => db.query.claims.findFirst({ where: eq(claims.id, id) })))
    : [];
  const validClaims = relatedClaims.filter(Boolean);

  const avgScore = validClaims.length > 0
    ? validClaims.reduce((s, c) => s + Number(c!.fraudScore ?? 0), 0) / validClaims.length
    : 0;

  // Score distribution
  const bands = [
    { band: "Low (0-30)", min: 0, max: 30 },
    { band: "Medium (31-60)", min: 31, max: 60 },
    { band: "High (61-80)", min: 61, max: 80 },
    { band: "Critical (81-100)", min: 81, max: 100 },
  ];
  const scoreDistribution = bands.map((b) => ({
    band: b.band,
    count: validClaims.filter((c) => {
      const s = Number(c!.fraudScore ?? -1);
      return s >= b.min && s <= b.max;
    }).length,
  }));

  // District heatmap from fraud_heatmap_daily
  const heatmap = await db.query.fraudHeatmapDaily.findMany({ limit: 15 });
  const districtHeatmap = heatmap.map((h) => ({
    districtId: h.districtId,
    fraudRate: Number(h.fraudRate ?? 0) / 100,
    totalClaims: h.totalClaims ?? 0,
  })).sort((a, b) => b.fraudRate - a.fraudRate);

  // Operator risk from cscOperators
  const operators = await db.query.cscOperators.findMany({ limit: 20 });
  const operatorRisk = operators.map((op) => {
    const total = op.totalClaims ?? 0;
    const fraud = op.fraudFlagCount ?? 0;
    return {
      operatorId: op.id,
      name: op.name,
      fraudRate: total > 0 ? fraud / total : 0,
      totalClaims: total,
    };
  }).sort((a, b) => b.fraudRate - a.fraudRate);

  return ok(res, {
    summary: {
      totalAssigned: allVisits.length,
      completed,
      pendingReview: pending,
      avgScore: Number(avgScore.toFixed(1)),
    },
    scoreDistribution,
    districtHeatmap,
    operatorRisk,
  });
});

export default router;
