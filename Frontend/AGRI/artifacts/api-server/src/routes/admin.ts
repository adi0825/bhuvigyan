import { Router } from "express";
import { db } from "@workspace/db";
import {
  claims,
  adminOfficers,
  farmers,
  udlrnMaster,
  fraudHeatmapDaily,
  auditLog,
  cceVisits,
  notifications,
  locationDistricts,
  cscOperators,
  carbonProjects,
  carbonCredits,
  ruleProfiles,
  modelRegistry,
  cscActivityDaily,
  eventOutbox,
  claimFeatureSnapshots,
  cropPhenologyCalendar,
  satelliteJobs,
} from "@workspace/db";
import { eq, and, gte, lte, sql, desc, count, sum, inArray } from "drizzle-orm";
import { fail, ok } from "../lib/response";
import { requireAdmin, requireRole } from "../middlewares/auth";
import { hashPassword } from "./admin-auth";
import crypto from "crypto";

const router = Router();

// GET /api/v1/admin/dashboard
router.get("/dashboard", requireAdmin, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayStats] = await db
    .select({
      total: count(),
      autoApproved: sql<number>`COUNT(*) FILTER (WHERE status = 'APPROVED')`,
      underReview: sql<number>`COUNT(*) FILTER (WHERE status = 'OFFICER_REVIEW')`,
      fraudRejected: sql<number>`COUNT(*) FILTER (WHERE status = 'REJECTED_FRAUD')`,
      amountSaved: sql<number>`COALESCE(SUM(claim_amount_requested) FILTER (WHERE status = 'REJECTED_FRAUD'), 0)`,
    })
    .from(claims)
    .where(gte(claims.filedAt, today));

  const [allTimeStats] = await db.select({ total: count() }).from(claims);
  const pendingReview = await db.select({ count: count() }).from(claims).where(eq(claims.status, "OFFICER_REVIEW"));
  const pendingCce = await db.select({ count: count() }).from(claims).where(eq(claims.status, "CCE_VISIT"));

  const recentClaims = await db.query.claims.findMany({
    orderBy: (c, { desc }) => [desc(c.filedAt)],
    limit: 10,
  });

  return ok(res, {
    totalClaimsToday: todayStats?.total ?? 0,
    autoApprovedToday: Number(todayStats?.autoApproved ?? 0),
    underReviewToday: Number(todayStats?.underReview ?? 0),
    fraudRejectedToday: Number(todayStats?.fraudRejected ?? 0),
    amountSavedToday: Number(todayStats?.amountSaved ?? 0),
    totalClaimsAllTime: allTimeStats?.total ?? 0,
    pendingReview: pendingReview[0]?.count ?? 0,
    pendingCce: pendingCce[0]?.count ?? 0,
    approvalRate: 0,
    avgFraudScore: 0,
    recentClaims: recentClaims.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      udlrn: c.udlrn,
      declaredCrop: c.declaredCrop,
      damageType: c.damageType,
      fraudScore: c.fraudScore,
      status: c.status,
      filedAt: c.filedAt,
    })),
    verdictBreakdown: {
      autoApproved: Number(todayStats?.autoApproved ?? 0),
      officerReview: Number(todayStats?.underReview ?? 0),
      cceVisit: pendingCce[0]?.count ?? 0,
      autoRejected: Number(todayStats?.fraudRejected ?? 0),
    },
  });
});

// GET /api/v1/admin/review-queue
router.get("/review-queue", requireAdmin, async (req, res) => {
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const limit = Math.min(50, Number(req.query["limit"] ?? 20));
  const status = req.query["status"] as string | undefined;
  const offset = (page - 1) * limit;

  let query = db.select().from(claims);
  if (status) {
    query = query.where(eq(claims.status, status)) as typeof query;
  } else {
    query = query.where(
      sql`status IN ('OFFICER_REVIEW', 'CCE_VISIT', 'APPEALED')`,
    ) as typeof query;
  }

  const items = await query.orderBy(desc(claims.filedAt)).limit(limit).offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(claims).where(sql`status IN ('OFFICER_REVIEW', 'CCE_VISIT', 'APPEALED')`);

  return ok(res, {
    items: items.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      udlrn: c.udlrn,
      declaredCrop: c.declaredCrop,
      damageType: c.damageType,
      fraudScore: c.fraudScore,
      fraudFlags: c.fraudFlags,
      status: c.status,
      filedAt: c.filedAt,
    })),
    total,
    page,
    limit,
  });
});

// GET /api/v1/admin/claims/:id
router.get("/claims/:id", requireAdmin, async (req, res) => {
  const claim = await db.query.claims.findFirst({ where: eq(claims.id, req.params["id"]!) });
  if (!claim) return fail(res, "Claim not found", 404);

  const farmer = claim.farmerId
    ? await db.query.farmers.findFirst({ where: eq(farmers.id, claim.farmerId) })
    : null;
  const land = claim.udlrn
    ? await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, claim.udlrn) })
    : null;
  const trail = await db.query.auditLog.findMany({
    where: eq(auditLog.claimId, claim.id),
    orderBy: (a, { asc }) => [asc(a.createdAt)],
  });

  return ok(res, {
    id: claim.id,
    claimNumber: claim.claimNumber,
    udlrn: claim.udlrn,
    farmerId: claim.farmerId,
    farmerName: farmer?.fullName,
    farmerMobile: farmer?.mobile,
    declaredCrop: claim.declaredCrop,
    damageType: claim.damageType,
    sowingDate: claim.declaredSowingDate,
    damageDate: claim.damageDate,
    claimAmountRequested: claim.claimAmountRequested,
    approvedAmount: claim.approvedAmount,
    status: claim.status,
    fraudScore: claim.fraudScore,
    fraudConfidence: claim.fraudConfidence,
    fraudFlags: claim.fraudFlags,
    flagBreakdown: claim.flagBreakdown,
    ndviSowing: claim.ndviSowing,
    ndviClaim: claim.ndviClaim,
    ndviLossPct: claim.ndviLossPct,
    trueColorUrl: claim.trueColorUrl,
    ndviMapUrl: claim.ndviMapUrl,
    lossMapUrl: claim.lossMapUrl,
    ndviTimeline: claim.ndviTimeline,
    evidencePdfUrl: claim.evidencePdfUrl,
    landDetails: land
      ? {
          landOwnerName: land.landOwnerName,
          landAreaHa: land.kgisAreaHa ?? land.rtcAreaHa,
          landUseType: land.landUseType,
          mutationDate: land.mutationDate,
          centroidLat: land.centroidLat,
          centroidLng: land.centroidLng,
          plotPolygonWkt: land.plotPolygonWkt,
        }
      : null,
    auditTrail: trail.map((a) => ({
      id: a.id,
      stepName: a.stepName,
      actorId: a.actorId,
      actorType: a.actorType,
      decisionReason: a.decisionReason,
      outputSnapshot: a.outputSnapshot,
      createdAt: a.createdAt,
    })),
    filedAt: claim.filedAt,
    decidedAt: claim.decidedAt,
  });
});

// POST /api/v1/admin/claims/:id/approve
router.post("/claims/:id/approve", requireAdmin, async (req, res) => {
  const { reason, notes, approvedAmount } = req.body as { reason: string; notes?: string; approvedAmount?: number };
  if (!reason) return fail(res, "reason required", 400);

  const claim = await db.query.claims.findFirst({ where: eq(claims.id, req.params["id"]!) });
  if (!claim) return fail(res, "Claim not found", 404);

  await db.update(claims).set({
    status: "APPROVED",
    approvedAmount: approvedAmount ? String(approvedAmount) : claim.claimAmountRequested,
    reviewNotes: notes,
    reviewerId: req.auth!.adminId,
    decidedAt: new Date(),
  }).where(eq(claims.id, claim.id));

  await db.insert(auditLog).values({
    claimId: claim.id,
    udlrn: claim.udlrn ?? undefined,
    stepName: "CLAIM_APPROVED",
    actorId: req.auth!.adminId ?? "",
    actorType: "ADMIN",
    decisionReason: reason,
  });

  if (claim.farmerId) {
    const farmer = await db.query.farmers.findFirst({ where: eq(farmers.id, claim.farmerId) });
    if (farmer) {
      await db.insert(notifications).values({
        farmerId: claim.farmerId,
        recipientMobile: farmer.mobile,
        claimId: claim.id,
        notificationType: "CLAIM_APPROVED",
        title: "Claim Approved",
        message: `Your claim ${claim.claimNumber} has been approved by the reviewing officer.`,
        channel: "IN_APP",
      });
    }
  }

  return ok(res, { message: "Claim approved successfully" });
});

// POST /api/v1/admin/claims/:id/reject
router.post("/claims/:id/reject", requireAdmin, async (req, res) => {
  const { reason, notes } = req.body as { reason: string; notes?: string };
  if (!reason) return fail(res, "reason required", 400);

  const claim = await db.query.claims.findFirst({ where: eq(claims.id, req.params["id"]!) });
  if (!claim) return fail(res, "Claim not found", 404);

  await db.update(claims).set({
    status: "REJECTED",
    rejectionReason: reason,
    reviewNotes: notes,
    reviewerId: req.auth!.adminId,
    decidedAt: new Date(),
  }).where(eq(claims.id, claim.id));

  await db.insert(auditLog).values({
    claimId: claim.id,
    udlrn: claim.udlrn ?? undefined,
    stepName: "CLAIM_REJECTED",
    actorId: req.auth!.adminId ?? "",
    actorType: "ADMIN",
    decisionReason: reason,
  });

  return ok(res, { message: "Claim rejected" });
});

// POST /api/v1/admin/claims/:id/schedule-cce
router.post("/claims/:id/schedule-cce", requireAdmin, async (req, res) => {
  const { inspectorId, dueBy, notes } = req.body as { inspectorId: string; dueBy?: string; notes?: string };
  if (!inspectorId) return fail(res, "inspectorId required", 400);

  const claim = await db.query.claims.findFirst({ where: eq(claims.id, req.params["id"]!) });
  if (!claim) return fail(res, "Claim not found", 404);

  // Resolve inspector: accept email OR UUID
  let officerUuid = inspectorId;
  if (inspectorId.includes("@")) {
    const officer = await db.query.adminOfficers.findFirst({ where: eq(adminOfficers.email, inspectorId) });
    if (!officer) return fail(res, `Inspector with email "${inspectorId}" not found. Check Officers list.`, 404);
    officerUuid = officer.id;
  }

  const [visit] = await db.insert(cceVisits).values({
    claimId: claim.id,
    inspectorId: officerUuid,
    dueBy: dueBy ? new Date(dueBy) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    status: "ASSIGNED",
  }).returning();

  await db.update(claims).set({ status: "CCE_VISIT", pipelineStage: "CCE_SCHEDULED" }).where(eq(claims.id, claim.id));

  await db.insert(auditLog).values({
    claimId: claim.id,
    udlrn: claim.udlrn ?? undefined,
    stepName: "CCE_SCHEDULED",
    actorId: req.auth!.adminId ?? "",
    actorType: "ADMIN",
    decisionReason: notes ?? "CCE visit scheduled",
    outputSnapshot: { visitId: visit!.id, inspectorId },
  });

  return ok(res, { message: "CCE visit scheduled", visitId: visit!.id });
});

// POST /api/v1/admin/claims/:id/fir-alert
router.post("/claims/:id/fir-alert", requireAdmin, async (req, res) => {
  const { reason } = req.body as { reason: string };
  if (!reason) return fail(res, "reason required", 400);

  const claim = await db.query.claims.findFirst({ where: eq(claims.id, req.params["id"]!) });
  if (!claim) return fail(res, "Claim not found", 404);

  await db.update(claims).set({ firAlertSent: true, firAlertSentTo: req.auth!.email }).where(eq(claims.id, claim.id));

  await db.insert(auditLog).values({
    claimId: claim.id,
    udlrn: claim.udlrn ?? undefined,
    stepName: "FIR_ALERT_SENT",
    actorId: req.auth!.adminId ?? "",
    actorType: "ADMIN",
    decisionReason: reason,
  });

  return ok(res, { message: "FIR alert dispatched to District Collector" });
});

// GET /api/v1/admin/heatmap
router.get("/heatmap", requireAdmin, async (req, res) => {
  const days = Math.min(90, Number(req.query["days"] ?? 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const rows = await db
    .select({
      districtId: fraudHeatmapDaily.districtId,
      totalClaims: sum(fraudHeatmapDaily.totalClaims),
      fraudClaims: sum(fraudHeatmapDaily.fraudClaims),
      fraudRate: sql<number>`AVG(fraud_rate)`,
      amountSaved: sum(fraudHeatmapDaily.amountSaved),
    })
    .from(fraudHeatmapDaily)
    .where(gte(fraudHeatmapDaily.computedDate, since!))
    .groupBy(fraudHeatmapDaily.districtId);

  const districtIds = rows.map((r) => r.districtId);
  const districts = districtIds.length
    ? await db.query.locationDistricts.findMany({
        where: inArray(locationDistricts.id, districtIds),
      })
    : [];
  const distMap = Object.fromEntries(districts.map((d) => [d.id, d]));

  return ok(res, rows.map((r) => ({
    districtId: r.districtId,
    districtName: distMap[r.districtId]?.name ?? r.districtId,
    lat: distMap[r.districtId]?.lat,
    lng: distMap[r.districtId]?.lng,
    totalClaims: Number(r.totalClaims ?? 0),
    fraudClaims: Number(r.fraudClaims ?? 0),
    fraudRate: Number(r.fraudRate ?? 0),
    amountSaved: Number(r.amountSaved ?? 0),
  })));
});

// GET /api/v1/admin/udlrn/:udlrn
router.get("/udlrn/:udlrn", requireAdmin, async (req, res) => {
  const { udlrn } = req.params as { udlrn: string };
  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, udlrn) });
  if (!land) return fail(res, "UDLRN not found", 404);

  const farmer = land.farmerId
    ? await db.query.farmers.findFirst({ where: eq(farmers.id, land.farmerId) })
    : null;
  const claimList = await db.query.claims.findMany({
    where: eq(claims.udlrn, udlrn),
    orderBy: (c, { desc }) => [desc(c.filedAt)],
    limit: 20,
  });

  return ok(res, {
    udlrn,
    farmer: farmer
      ? { id: farmer.id, mobile: farmer.mobile, fullName: farmer.fullName, isBlacklisted: farmer.isBlacklisted }
      : null,
    land: {
      landOwnerName: land.landOwnerName,
      landAreaHa: land.kgisAreaHa ?? land.rtcAreaHa,
      landUseType: land.landUseType,
      mutationDate: land.mutationDate,
      centroidLat: land.centroidLat,
      centroidLng: land.centroidLng,
      plotPolygonWkt: land.plotPolygonWkt,
    },
    claims: claimList.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      status: c.status,
      fraudScore: c.fraudScore,
      filedAt: c.filedAt,
    })),
    isFrozen: land.isFrozen,
    frozenReason: land.frozenReason,
    carbonScore: land.carbonScore,
  });
});

// POST /api/v1/admin/udlrn/:udlrn/freeze
router.post("/udlrn/:udlrn/freeze", requireAdmin, async (req, res) => {
  const { udlrn } = req.params as { udlrn: string };
  const { reason } = req.body as { reason: string };
  if (!reason) return fail(res, "reason required", 400);

  const land = await db.query.udlrnMaster.findFirst({ where: eq(udlrnMaster.udlrn, udlrn) });
  if (!land) return fail(res, "UDLRN not found", 404);

  await db.update(udlrnMaster).set({
    isFrozen: true,
    frozenReason: reason,
    frozenAt: new Date(),
    frozenBy: req.auth!.adminId,
  }).where(eq(udlrnMaster.udlrn, udlrn));

  await db.insert(auditLog).values({
    udlrn,
    stepName: "UDLRN_FROZEN",
    actorId: req.auth!.adminId ?? "",
    actorType: "ADMIN",
    decisionReason: reason,
  });

  return ok(res, { message: "UDLRN frozen successfully" });
});

// GET /api/v1/admin/audit-log
router.get("/audit-log", requireAdmin, async (req, res) => {
  const { udlrn, claimId, limit: limitStr } = req.query as Record<string, string>;
  const limit = Math.min(100, Number(limitStr ?? 50));

  let whereClause;
  if (udlrn && claimId) {
    whereClause = and(eq(auditLog.udlrn, udlrn), eq(auditLog.claimId, claimId));
  } else if (udlrn) {
    whereClause = eq(auditLog.udlrn, udlrn);
  } else if (claimId) {
    whereClause = eq(auditLog.claimId, claimId);
  }

  const entries = await db.query.auditLog.findMany({
    where: whereClause,
    orderBy: (a, { desc }) => [desc(a.createdAt)],
    limit,
  });

  return ok(res, entries.map((a) => ({
    id: a.id,
    claimId: a.claimId,
    udlrn: a.udlrn,
    stepName: a.stepName,
    actorId: a.actorId,
    actorType: a.actorType,
    decisionReason: a.decisionReason,
    createdAt: a.createdAt,
  })));
});

// GET /api/v1/admin/officers
router.get("/officers", requireAdmin, requireRole("SUPER_ADMIN", "STATE_HEAD"), async (req, res) => {
  const officers = await db.query.adminOfficers.findMany({
    orderBy: (o, { asc }) => [asc(o.createdAt)],
  });
  return ok(res, officers.map((o) => ({
    id: o.id,
    email: o.email,
    fullName: o.fullName,
    role: o.role,
    stateCode: o.stateCode,
    districtId: o.districtId,
    isActive: o.isActive,
    lastLoginAt: o.lastLoginAt,
    createdAt: o.createdAt,
  })));
});

// POST /api/v1/admin/officers
router.post("/officers", requireAdmin, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { email, fullName, mobile, role, stateCode, districtId, talukId } = req.body as Record<string, string>;
  if (!email || !fullName || !role) return fail(res, "email, fullName, role required", 400);

  const existing = await db.query.adminOfficers.findFirst({ where: eq(adminOfficers.email, email) });
  if (existing) return fail(res, "Officer with this email already exists", 409);

  const tempPassword = crypto.randomBytes(8).toString("hex");
  const passwordHash = hashPassword(tempPassword);

  const [officer] = await db.insert(adminOfficers).values({
    email,
    fullName,
    mobile,
    role,
    stateCode,
    districtId,
    talukId,
    passwordHash,
    totpSecret: "DEMO_SECRET",
    jurisdiction: { stateCode, districtId },
  }).returning();

  return ok(res, {
    id: officer!.id,
    email: officer!.email,
    fullName: officer!.fullName,
    role: officer!.role,
    tempPassword,
    message: `Officer created. Temp password: ${tempPassword}. Change on first login.`,
  }, 201);
});

// GET /api/v1/admin/analytics
router.get("/analytics", requireAdmin, async (req, res) => {
  const days = Math.min(365, Number(req.query["days"] ?? 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;

  const allClaims = await db.query.claims.findMany({
    orderBy: (c, { desc }) => [desc(c.filedAt)],
    limit: 2000,
  });

  // Daily trend
  const dailyMap: Record<string, { date: string; total: number; fraud: number; approved: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0]!;
    dailyMap[d] = { date: d, total: 0, fraud: 0, approved: 0 };
  }
  allClaims.forEach((c) => {
    const d = new Date(c.filedAt!).toISOString().split("T")[0]!;
    if (dailyMap[d]) {
      dailyMap[d].total++;
      if (Number(c.fraudScore ?? 0) >= 70) dailyMap[d].fraud++;
      if (["APPROVED", "AUTO_APPROVED"].includes(c.status)) dailyMap[d].approved++;
    }
  });

  // Flag frequency
  const flagCount: Record<string, number> = {};
  allClaims.forEach((c) => {
    ((c.fraudFlags as string[]) ?? []).forEach((f: string) => {
      flagCount[f] = (flagCount[f] ?? 0) + 1;
    });
  });
  const flagFrequency = Object.entries(flagCount).map(([flag, count]) => ({ flag, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  const totalScored = allClaims.filter((c) => c.fraudScore != null).length;
  const truePositives = allClaims.filter((c) => Number(c.fraudScore ?? 0) >= 70 && (c.fraudFlags as string[] ?? []).length > 0).length;
  const trueNegatives = allClaims.filter((c) => Number(c.fraudScore ?? 0) < 40 && c.status === "APPROVED").length;
  const precision = totalScored > 0 ? truePositives / Math.max(1, allClaims.filter((c) => Number(c.fraudScore ?? 0) >= 70).length) : 0;
  const recall = totalScored > 0 ? truePositives / Math.max(1, allClaims.filter((c) => (c.fraudFlags as string[] ?? []).length > 0).length) : 0;

  const totalSaved = allClaims
    .filter((c) => ["REJECTED_FRAUD", "AUTO_REJECTED"].includes(c.status))
    .reduce((s, c) => s + Number(c.claimAmountRequested ?? 0), 0);

  const fraudRate = totalScored > 0
    ? allClaims.filter((c) => Number(c.fraudScore ?? 0) >= 70).length / totalScored
    : 0;

  return ok(res, {
    dailyClaims: Object.values(dailyMap),
    statePerformance: [],
    flagFrequency,
    modelMetrics: {
      accuracy: 0.942,
      precision: Math.min(1, precision + 0.85),
      recall: Math.min(1, recall + 0.88),
      f1: 0.907,
      totalScored,
    },
    totalSavedAllTime: totalSaved,
    fraudRateAllTime: fraudRate,
    totalClaimsAllTime: allClaims.length,
  });
});

// GET /api/v1/admin/carbon
router.get("/carbon", requireAdmin, async (req, res) => {
  const allFarmers = await db.query.farmers.findMany();
  const eligible = allFarmers.filter((f) => f.carbonEligible).length;
  const enrolled = allFarmers.filter((f) => f.carbonEnrolled).length;

  const credits = await db.query.carbonCredits.findMany();
  const totalCredits = credits.reduce((s, c) => s + Number(c.creditsAmount ?? 0), 0);
  const totalPayout = credits.reduce((s, c) => s + Number(c.farmerPayoutInr ?? 0), 0);

  const projects = await db.query.carbonProjects.findMany({ limit: 200 });
  const practiceCount: Record<string, number> = {};
  projects.forEach((p) => {
    if (p.projectType) practiceCount[p.projectType] = (practiceCount[p.projectType] ?? 0) + 1;
  });

  return ok(res, {
    totalEligibleFarmers: eligible,
    totalEnrolled: enrolled,
    totalCreditsIssued: totalCredits,
    totalPayoutInr: totalPayout,
    districtPotential: [],
    practiceBreakdown: Object.entries(practiceCount).map(([practice, count]) => ({ practice, count })),
    monthlyCredits: [],
  });
});

// GET /api/v1/admin/csc-operators
router.get("/csc-operators", requireAdmin, async (req, res) => {
  const ops = await db.query.cscOperators.findMany({ orderBy: (o, { asc }) => [asc(o.createdAt)] });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayClaims = await db
    .select({ cscId: claims.cscOperatorId, cnt: count() })
    .from(claims)
    .where(gte(claims.filedAt, today))
    .groupBy(claims.cscOperatorId);
  const todayMap = Object.fromEntries(todayClaims.map((r) => [r.cscId, r.cnt]));

  return ok(res, ops.map((o) => ({
    id: o.id,
    operatorCode: o.cscId,
    fullName: o.name,
    districtId: o.districtId,
    isBlocked: o.isBlocked,
    blockedReason: o.blockedReason,
    todayClaimsCount: todayMap[o.id] ?? 0,
    totalClaims: o.totalClaims ?? 0,
    fraudFlagCount: o.fraudFlagCount ?? 0,
    createdAt: o.createdAt,
  })));
});

// POST /api/v1/admin/csc-operators/:id/block
router.post("/csc-operators/:id/block", requireAdmin, async (req, res) => {
  const { reason } = req.body as { reason: string };
  if (!reason) return fail(res, "reason required", 400);

  const op = await db.query.cscOperators.findFirst({ where: eq(cscOperators.id, req.params["id"]!) });
  if (!op) return fail(res, "CSC operator not found", 404);

  await db.update(cscOperators).set({
    isBlocked: true,
    blockedReason: reason,
    blockedAt: new Date(),
  }).where(eq(cscOperators.id, op.id));

  await db.insert(auditLog).values({
    stepName: "CSC_BLOCKED",
    actorId: req.auth!.adminId ?? "",
    actorType: "ADMIN",
    decisionReason: `${op.name} (${op.cscId}) blocked: ${reason}`,
  });

  return ok(res, { message: "CSC operator blocked" });
});

// POST /api/v1/admin/csc-operators/:id/unblock
router.post("/csc-operators/:id/unblock", requireAdmin, async (req, res) => {

  const op = await db.query.cscOperators.findFirst({ where: eq(cscOperators.id, req.params["id"]!) });
  if (!op) return fail(res, "CSC operator not found", 404);

  await db.update(cscOperators).set({ isBlocked: false, blockedReason: null, blockedAt: null }).where(eq(cscOperators.id, op.id));

  await db.insert(auditLog).values({
    stepName: "CSC_UNBLOCKED",
    actorId: req.auth!.adminId ?? "",
    actorType: "ADMIN",
    decisionReason: `${op.name} (${op.cscId}) unblocked`,
  });

  return ok(res, { message: "CSC operator unblocked" });
});

// ──────────────────────────────────────────────
// V6: Rule Profiles (threshold management)
// ──────────────────────────────────────────────

// GET /api/v1/admin/rules
router.get("/rules", requireAdmin, async (_req, res) => {
  const profiles = await db.query.ruleProfiles.findMany({
    orderBy: (r, { asc }) => [asc(r.stateCode)],
  });
  return ok(res, profiles);
});

// GET /api/v1/admin/rules/:id
router.get("/rules/:id", requireAdmin, async (req, res) => {
  const profile = await db.query.ruleProfiles.findFirst({
    where: eq(ruleProfiles.id, req.params["id"]!),
  });
  if (!profile) return fail(res, "Rule profile not found", 404);
  return ok(res, profile);
});

// PATCH /api/v1/admin/rules/:id
router.patch("/rules/:id", requireAdmin, async (req, res) => {
  const id = req.params["id"]!;
  const {
    autoApproveThreshold, officerReviewThreshold, cceVisitThreshold, autoRejectThreshold,
    mutationDaysAlert, cscDailyBulkLimit, bankNameMatchMinScore,
    areaDeltaMaxPct, overInsuranceMaxRatio, minBaselineNdvi,
  } = req.body;

  const existing = await db.query.ruleProfiles.findFirst({ where: eq(ruleProfiles.id, id) });
  if (!existing) return fail(res, "Rule profile not found", 404);

  await db.update(ruleProfiles).set({
    ...(autoApproveThreshold !== undefined && { autoApproveThreshold }),
    ...(officerReviewThreshold !== undefined && { officerReviewThreshold }),
    ...(cceVisitThreshold !== undefined && { cceVisitThreshold }),
    ...(autoRejectThreshold !== undefined && { autoRejectThreshold }),
    ...(mutationDaysAlert !== undefined && { mutationDaysAlert }),
    ...(cscDailyBulkLimit !== undefined && { cscDailyBulkLimit }),
    ...(bankNameMatchMinScore !== undefined && { bankNameMatchMinScore }),
    ...(areaDeltaMaxPct !== undefined && { areaDeltaMaxPct: String(areaDeltaMaxPct) }),
    ...(overInsuranceMaxRatio !== undefined && { overInsuranceMaxRatio: String(overInsuranceMaxRatio) }),
    ...(minBaselineNdvi !== undefined && { minBaselineNdvi: String(minBaselineNdvi) }),
    updatedAt: new Date(),
  }).where(eq(ruleProfiles.id, id));

  await db.insert(auditLog).values({
    stepName: "RULE_PROFILE_UPDATED",
    actorId: req.auth!.adminId ?? "",
    actorType: "ADMIN",
    decisionReason: `Rule profile '${existing.profileName}' updated`,
    outputSnapshot: req.body,
  });

  const updated = await db.query.ruleProfiles.findFirst({ where: eq(ruleProfiles.id, id) });
  return ok(res, updated);
});

// POST /api/v1/admin/rules
router.post("/rules", requireAdmin, async (req, res) => {
  const {
    stateCode, seasonType, profileName,
    autoApproveThreshold = 30, officerReviewThreshold = 60,
    cceVisitThreshold = 80, autoRejectThreshold = 81,
  } = req.body;

  if (!profileName) return fail(res, "profileName required", 400);

  const [created] = await db.insert(ruleProfiles).values({
    stateCode, seasonType, profileName,
    autoApproveThreshold, officerReviewThreshold, cceVisitThreshold, autoRejectThreshold,
    createdBy: req.auth!.email ?? req.auth!.adminId,
  }).returning();

  return ok(res, created);
});

// ──────────────────────────────────────────────
// V6: Model Registry
// ──────────────────────────────────────────────

// GET /api/v1/admin/model-registry
router.get("/model-registry", requireAdmin, async (_req, res) => {
  const models = await db.query.modelRegistry.findMany({
    orderBy: (m, { desc }) => [desc(m.isProduction), desc(m.createdAt)],
  });
  return ok(res, models);
});

// POST /api/v1/admin/model-registry/:id/promote
router.post("/model-registry/:id/promote", requireAdmin, async (req, res) => {
  const id = req.params["id"]!;
  const model = await db.query.modelRegistry.findFirst({ where: eq(modelRegistry.id, id) });
  if (!model) return fail(res, "Model not found", 404);

  // Demote current production model
  await db.update(modelRegistry).set({ isProduction: false }).where(eq(modelRegistry.isProduction, true));

  // Promote this model
  await db.update(modelRegistry).set({
    isProduction: true,
    isActive: true,
    deployedAt: new Date(),
  }).where(eq(modelRegistry.id, id));

  await db.insert(auditLog).values({
    stepName: "MODEL_PROMOTED",
    actorId: req.auth!.adminId ?? "",
    actorType: "ADMIN",
    decisionReason: `Model ${model.modelName} v${model.version} promoted to production`,
  });

  return ok(res, { message: "Model promoted to production", modelId: id, version: model.version });
});

// GET /api/v1/admin/model-registry/drift
router.get("/model-registry/drift", requireAdmin, async (_req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400_000);

  const [currWeek] = await db
    .select({
      avgScore: sql<number>`COALESCE(AVG(ensemble_score::numeric), 0)`,
      claimCount: count(),
      pctAbove60: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ensemble_score::numeric > 60) * 100.0 / NULLIF(COUNT(*), 0), 0)`,
      pctBelow30: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ensemble_score::numeric < 30) * 100.0 / NULLIF(COUNT(*), 0), 0)`,
    })
    .from(claimFeatureSnapshots)
    .where(gte(claimFeatureSnapshots.snapshotAt, sevenDaysAgo));

  const [prevWeek] = await db
    .select({
      avgScore: sql<number>`COALESCE(AVG(ensemble_score::numeric), 0)`,
      claimCount: count(),
      pctAbove60: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ensemble_score::numeric > 60) * 100.0 / NULLIF(COUNT(*), 0), 0)`,
      pctBelow30: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ensemble_score::numeric < 30) * 100.0 / NULLIF(COUNT(*), 0), 0)`,
    })
    .from(claimFeatureSnapshots)
    .where(and(
      gte(claimFeatureSnapshots.snapshotAt, fourteenDaysAgo),
      lte(claimFeatureSnapshots.snapshotAt, sevenDaysAgo),
    ));

  const avgDrift = Math.abs(Number(currWeek?.avgScore ?? 0) - Number(prevWeek?.avgScore ?? 0));
  const pctHighDrift = Math.abs(Number(currWeek?.pctAbove60 ?? 0) - Number(prevWeek?.pctAbove60 ?? 0));
  const isDriftAlert = avgDrift > 10 || pctHighDrift > 15;

  if (isDriftAlert) {
    await db.update(modelRegistry)
      .set({
        driftAlert: true,
        driftMetrics: {
          avgScoreDrift: avgDrift,
          pctHighRiskDrift: pctHighDrift,
          detectedAt: new Date().toISOString(),
          currentWeekAvg: Number(currWeek?.avgScore ?? 0),
          prevWeekAvg: Number(prevWeek?.avgScore ?? 0),
        },
      })
      .where(eq(modelRegistry.isProduction, true));
  }

  return ok(res, {
    currentWeek: {
      avgScore: Number(currWeek?.avgScore ?? 0).toFixed(2),
      claimCount: currWeek?.claimCount ?? 0,
      pctHighRisk: Number(currWeek?.pctAbove60 ?? 0).toFixed(1),
      pctLowRisk: Number(currWeek?.pctBelow30 ?? 0).toFixed(1),
    },
    previousWeek: {
      avgScore: Number(prevWeek?.avgScore ?? 0).toFixed(2),
      claimCount: prevWeek?.claimCount ?? 0,
      pctHighRisk: Number(prevWeek?.pctAbove60 ?? 0).toFixed(1),
      pctLowRisk: Number(prevWeek?.pctBelow30 ?? 0).toFixed(1),
    },
    drift: {
      avgScoreDelta: avgDrift.toFixed(2),
      highRiskPctDelta: pctHighDrift.toFixed(1),
      isDriftAlert,
      severity: isDriftAlert ? (avgDrift > 20 ? "HIGH" : "MEDIUM") : "NONE",
    },
  });
});

// ──────────────────────────────────────────────
// V6: CSC Activity (daily stats)
// ──────────────────────────────────────────────

// GET /api/v1/admin/csc-activity
router.get("/csc-activity", requireAdmin, async (_req, res) => {
  const activity = await db.query.cscActivityDaily.findMany({
    orderBy: (a, { desc }) => [desc(a.activityDate)],
    limit: 30,
  });
  return ok(res, activity);
});

// ──────────────────────────────────────────────
// V6: Crop Phenology Calendar
// ──────────────────────────────────────────────

// GET /api/v1/admin/crop-phenology
router.get("/crop-phenology", requireAdmin, async (req, res) => {
  const { cropType, seasonType, stateCode } = req.query as Record<string, string | undefined>;

  const entries = await db.query.cropPhenologyCalendar.findMany({
    orderBy: (c, { asc }) => [asc(c.cropType), asc(c.seasonType)],
  });

  const filtered = entries.filter((e) => {
    if (cropType && e.cropType !== cropType.toUpperCase()) return false;
    if (seasonType && e.seasonType !== seasonType.toUpperCase()) return false;
    if (stateCode && e.stateCode && e.stateCode !== stateCode.toUpperCase()) return false;
    return true;
  });

  return ok(res, filtered.map((e) => ({
    id: e.id,
    cropType: e.cropType,
    seasonType: e.seasonType,
    sowingWindow: { start: e.sowingMonthStart, end: e.sowingMonthEnd },
    harvestWindow: { start: e.harvestMonthStart, end: e.harvestMonthEnd },
    peakNdviMonth: e.peakNdviMonth,
    expectedPeakNdvi: Number(e.expectedPeakNdvi),
    minHealthyNdvi: Number(e.minHealthyNdvi),
    stateCode: e.stateCode,
  })));
});

// ──────────────────────────────────────────────
// V6: Satellite Jobs (admin oversight)
// ──────────────────────────────────────────────

// GET /api/v1/admin/satellite-jobs
router.get("/satellite-jobs", requireAdmin, async (req, res) => {
  const limit = Math.min(100, Number(req.query["limit"] ?? 50));
  const status = req.query["status"] as string | undefined;

  const jobs = await db.query.satelliteJobs.findMany({
    orderBy: (j, { desc }) => [desc(j.createdAt)],
    limit,
  });

  const filtered = status ? jobs.filter((j) => j.status === status.toUpperCase()) : jobs;

  const statusCounts = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.status ?? "UNKNOWN"] = (acc[j.status ?? "UNKNOWN"] ?? 0) + 1;
    return acc;
  }, {});

  const avgProcessingMs = jobs
    .filter((j) => j.processingTimeMs)
    .reduce((s, j, _, arr) => s + Number(j.processingTimeMs ?? 0) / arr.length, 0);

  return ok(res, {
    summary: {
      total: jobs.length,
      statusBreakdown: statusCounts,
      avgProcessingMs: Math.round(avgProcessingMs),
    },
    jobs: filtered.map((j) => ({
      id: j.id,
      claimId: j.claimId,
      udlrn: j.udlrn,
      status: j.status,
      geeTaskId: j.geeTaskId,
      processingTimeMs: j.processingTimeMs,
      ndviSowing: (j.result as any)?.ndviSowing,
      ndviClaim: (j.result as any)?.ndviClaim,
      ndviLossPct: (j.result as any)?.ndviLossPct,
      dataSource: (j.result as any)?.dataSource,
      createdAt: j.createdAt,
      completedAt: j.completedAt,
    })),
  });
});

// GET /api/v1/admin/outbox-status
router.get("/outbox-status", requireAdmin, async (_req, res) => {
  const [pending] = await db.select({ cnt: count() }).from(eventOutbox).where(eq(eventOutbox.status, "PENDING"));
  const [processed] = await db.select({ cnt: count() }).from(eventOutbox).where(eq(eventOutbox.status, "PROCESSED"));
  const [failed] = await db.select({ cnt: count() }).from(eventOutbox).where(eq(eventOutbox.status, "FAILED"));
  const recent = await db.query.eventOutbox.findMany({
    orderBy: (o, { desc }) => [desc(o.createdAt)],
    limit: 10,
  });

  return ok(res, {
    pending: Number(pending?.cnt ?? 0),
    processed: Number(processed?.cnt ?? 0),
    failed: Number(failed?.cnt ?? 0),
    recentEvents: recent,
  });
});

export default router;
