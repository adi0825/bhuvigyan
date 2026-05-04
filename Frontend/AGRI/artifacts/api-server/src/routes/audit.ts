import { Router } from "express";
import { db } from "@workspace/db";
import { auditLog } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ok, fail } from "../lib/response";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// GET /api/v1/audit/:traceId — audit events by trace ID
router.get("/:traceId", requireAdmin, async (req, res) => {
  const { traceId } = req.params;

  const events = await db.query.auditLog.findMany({
    where: eq(auditLog.traceId, traceId),
    orderBy: (a, { asc }) => [asc(a.createdAt)],
  });

  if (!events.length) {
    const byId = await db.query.auditLog.findMany({
      where: eq(auditLog.id, traceId),
      orderBy: (a, { asc }) => [asc(a.createdAt)],
    });
    if (byId.length) {
      return ok(res, byId.map(formatEvent));
    }
    return fail(res, "No audit events found for traceId", 404);
  }

  return ok(res, events.map(formatEvent));
});

// GET /api/v1/audit/claim/:claimId — audit events by claim ID
router.get("/claim/:claimId", requireAdmin, async (req, res) => {
  const { claimId } = req.params;

  const events = await db.query.auditLog.findMany({
    where: eq(auditLog.claimId, claimId),
    orderBy: (a, { asc }) => [asc(a.createdAt)],
  });

  return ok(res, events.map(formatEvent));
});

// GET /api/v1/audit/entity?entityType&entityId
router.get("/entity", requireAdmin, async (req, res) => {
  const { entityType, entityId } = req.query as Record<string, string>;
  if (!entityId) return fail(res, "entityId required", 400);

  let events;
  if (entityType === "CLAIM") {
    events = await db.query.auditLog.findMany({
      where: eq(auditLog.claimId, entityId),
      orderBy: (a, { asc }) => [asc(a.createdAt)],
    });
  } else if (entityType === "UDLRN") {
    events = await db.query.auditLog.findMany({
      where: eq(auditLog.udlrn, entityId),
      orderBy: (a, { asc }) => [asc(a.createdAt)],
    });
  } else {
    events = await db.query.auditLog.findMany({
      where: eq(auditLog.claimId, entityId),
      orderBy: (a, { asc }) => [asc(a.createdAt)],
    });
  }

  return ok(res, events.map(formatEvent));
});

function formatEvent(a: {
  id: string; claimId?: string | null; udlrn?: string | null; traceId?: string | null;
  stepName?: string | null; actorId?: string | null; actorType?: string | null;
  decisionReason?: string | null; outputSnapshot?: unknown; createdAt: Date;
}) {
  return {
    id: a.id,
    traceId: a.traceId ?? a.id,
    claimId: a.claimId,
    udlrn: a.udlrn,
    eventType: a.stepName,
    actorId: a.actorId,
    actorType: a.actorType,
    reason: a.decisionReason,
    payload: a.outputSnapshot,
    createdAt: a.createdAt,
  };
}

export default router;
