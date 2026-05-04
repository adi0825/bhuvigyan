import { Router } from "express";
import { db } from "@workspace/db";
import { cceVisits, claims, adminOfficers } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ok, fail } from "../lib/response";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// POST /api/v1/field-visits — create field visit
router.post("/", requireAdmin, async (req, res) => {
  const {
    claimId, officerId, dueBy, priority, notes,
  } = req.body as Record<string, string>;

  if (!claimId || !officerId) return fail(res, "claimId and officerId are required", 400);

  const claim = await db.query.claims.findFirst({ where: eq(claims.id, claimId) });
  if (!claim) return fail(res, "Claim not found", 404);

  let resolvedOfficerId = officerId;
  if (officerId.includes("@")) {
    const officer = await db.query.adminOfficers.findFirst({ where: eq(adminOfficers.email, officerId) });
    if (!officer) return fail(res, "Officer not found by email", 404);
    resolvedOfficerId = officer.id;
  }

  const [visit] = await db.insert(cceVisits).values({
    claimId,
    inspectorId: resolvedOfficerId,
    status: "ASSIGNED",
    dueBy: dueBy ? new Date(dueBy) : undefined,
    priority: (priority as "NORMAL" | "HIGH") ?? "NORMAL",
    notes,
  }).returning();

  await db.update(claims).set({ status: "CCE_VISIT", pipelineStage: "CCE" }).where(eq(claims.id, claimId));

  return ok(res, {
    id: visit!.id,
    claimId: visit!.claimId,
    officerId: visit!.inspectorId,
    status: visit!.status,
    priority: visit!.priority,
    dueBy: visit!.dueBy,
    assignedAt: visit!.createdAt,
  }, 201);
});

// GET /api/v1/field-visits/:id — get field visit
router.get("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const visit = await db.query.cceVisits.findFirst({ where: eq(cceVisits.id, id) });
  if (!visit) return fail(res, "Field visit not found", 404);

  const claim = await db.query.claims.findFirst({ where: eq(claims.id, visit.claimId!) });
  const officer = visit.inspectorId ? await db.query.adminOfficers.findFirst({ where: eq(adminOfficers.id, visit.inspectorId) }) : null;

  return ok(res, {
    id: visit.id,
    claimId: visit.claimId,
    claimNumber: claim?.claimNumber,
    officer: officer ? { id: officer.id, fullName: officer.fullName, email: officer.email } : null,
    status: visit.status,
    priority: visit.priority,
    dueBy: visit.dueBy,
    geoLat: visit.geoLat,
    geoLng: visit.geoLng,
    damageAssessmentPct: visit.damageAssessmentPct,
    cropCondition: visit.cropCondition,
    remarks: visit.notes,
    photoUrls: visit.photoUrls,
    submittedAt: visit.submittedAt,
    assignedAt: visit.createdAt,
  });
});

// PATCH /api/v1/field-visits/:id — update field visit
router.patch("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const visit = await db.query.cceVisits.findFirst({ where: eq(cceVisits.id, id) });
  if (!visit) return fail(res, "Field visit not found", 404);

  const { status, notes, geoLat, geoLng, damageAssessmentPct, cropCondition } = req.body as Record<string, string | number>;

  await db.update(cceVisits).set({
    ...(status && { status: status as "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" }),
    ...(notes && { notes: String(notes) }),
    ...(geoLat && { geoLat: String(geoLat) }),
    ...(geoLng && { geoLng: String(geoLng) }),
    ...(damageAssessmentPct !== undefined && { damageAssessmentPct: String(damageAssessmentPct) }),
    ...(cropCondition && { cropCondition: String(cropCondition) }),
  }).where(eq(cceVisits.id, id));

  const updated = await db.query.cceVisits.findFirst({ where: eq(cceVisits.id, id) });
  return ok(res, updated);
});

// POST /api/v1/field-visits/:id/complete — complete field visit
router.post("/:id/complete", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const visit = await db.query.cceVisits.findFirst({ where: eq(cceVisits.id, id) });
  if (!visit) return fail(res, "Field visit not found", 404);

  const { geoLat, geoLng, damageAssessmentPct, cropCondition, remarks, photoUrls } = req.body as Record<string, unknown>;

  await db.update(cceVisits).set({
    status: "COMPLETED",
    submittedAt: new Date(),
    geoLat: geoLat ? String(geoLat) : undefined,
    geoLng: geoLng ? String(geoLng) : undefined,
    damageAssessmentPct: damageAssessmentPct !== undefined ? String(damageAssessmentPct) : undefined,
    cropCondition: cropCondition ? String(cropCondition) : undefined,
    notes: remarks ? String(remarks) : visit.notes,
    photoUrls: photoUrls as string[] ?? visit.photoUrls,
  }).where(eq(cceVisits.id, id));

  return ok(res, { id, status: "COMPLETED", message: "Field visit completed successfully" });
});

// GET /api/v1/field-visits?officerId&status&page&size
router.get("/", requireAdmin, async (req, res) => {
  const { officerId, status, page: pageStr, size: sizeStr } = req.query as Record<string, string>;
  const page = Number(pageStr ?? 1);
  const size = Math.min(100, Number(sizeStr ?? 20));

  const allVisits = await db.query.cceVisits.findMany({
    where: officerId ? eq(cceVisits.inspectorId, officerId) : undefined,
    orderBy: (v, { desc }) => [desc(v.createdAt)],
    limit: size,
    offset: (page - 1) * size,
  });

  const filtered = status ? allVisits.filter((v) => v.status === status) : allVisits;

  const visitData = await Promise.all(filtered.map(async (v) => {
    const claim = v.claimId ? await db.query.claims.findFirst({ where: eq(claims.id, v.claimId) }) : null;
    const officer = v.inspectorId ? await db.query.adminOfficers.findFirst({ where: eq(adminOfficers.id, v.inspectorId) }) : null;
    return {
      id: v.id,
      claimId: v.claimId,
      claimNumber: claim?.claimNumber,
      udlrn: claim?.udlrn,
      farmerName: claim?.farmerName,
      officer: officer ? { id: officer.id, fullName: officer.fullName } : null,
      status: v.status,
      priority: v.priority,
      dueBy: v.dueBy,
      submittedAt: v.submittedAt,
      assignedAt: v.createdAt,
    };
  }));

  return ok(res, { data: visitData, page, size, total: visitData.length });
});

export default router;
