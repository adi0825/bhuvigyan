import { Router } from "express";
import { db, pool } from "@workspace/db";
import { eventOutbox, auditLog, modelRegistry } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { ok, fail } from "../lib/response";

const router = Router();

let degradedMode = false;
let degradedReason = "";

export function isDegradedMode() { return degradedMode; }

router.get("/health", async (_req, res) => {
  res.json({
    status: "UP",
    service: "bhuvigyan-api",
    version: "6.0.0",
    timestamp: new Date().toISOString(),
    mode: degradedMode ? "DEGRADED" : "NORMAL",
  });
});

router.get("/readiness", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "READY",
      checks: { database: "UP", schema: "OK", mode: degradedMode ? "DEGRADED" : "NORMAL" },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({ status: "NOT_READY", checks: { database: "DOWN" }, error: err.message });
  }
});

router.get("/dependencies", async (_req, res) => {
  const dbUp = await pool.query("SELECT 1").then(() => true).catch(() => false);

  const outboxPending = await db
    .select({ cnt: count() }).from(eventOutbox).where(eq(eventOutbox.status, "PENDING"))
    .then((r) => Number(r[0]?.cnt ?? 0)).catch(() => -1);

  const outboxDeadLetters = await db
    .select({ cnt: count() }).from(eventOutbox).where(eq(eventOutbox.status, "DEAD_LETTER"))
    .then((r) => Number(r[0]?.cnt ?? 0)).catch(() => -1);

  const prodModel = await db.query.modelRegistry
    .findFirst({ where: eq(modelRegistry.isProduction, true) }).catch(() => null);

  const stateAdapters = [
    { adapter: "BHOOMI_KA", state: "Karnataka", status: "SIMULATED", latencyMs: 45, cacheHitRate: 0.87 },
    { adapter: "MAHABHUMI_MH", state: "Maharashtra", status: "SIMULATED", latencyMs: 62, cacheHitRate: 0.91 },
    { adapter: "DHARANI_TG", state: "Telangana", status: "SIMULATED", latencyMs: 38, cacheHitRate: 0.78 },
    { adapter: "JAMABANDI_PB", state: "Punjab", status: "SIMULATED", latencyMs: 55, cacheHitRate: 0.82 },
    { adapter: "BHULEKH_UP", state: "Uttar Pradesh", status: "SIMULATED", latencyMs: 91, cacheHitRate: 0.69 },
    { adapter: "APNA_KHATA_RJ", state: "Rajasthan", status: "SIMULATED", latencyMs: 74, cacheHitRate: 0.73 },
  ];

  res.json({
    timestamp: new Date().toISOString(),
    mode: degradedMode ? "DEGRADED" : "NORMAL",
    dependencies: {
      database: { status: dbUp ? "UP" : "DOWN", type: "PostgreSQL", note: "Primary transactional store" },
      kafka: { status: "FALLBACK", type: "EventOutbox", note: "Kafka unavailable — using PostgreSQL event_outbox pattern" },
      cassandra: { status: "FALLBACK", type: "AuditLog", note: "Cassandra unavailable — using PostgreSQL audit_log" },
      minio: { status: "FALLBACK", type: "EvidenceFiles", note: "MinIO unavailable — evidence stored in PostgreSQL" },
      redis: { status: "FALLBACK", type: "StateAdapterCache", note: "Redis unavailable — using state_adapter_cache table" },
    },
    pipeline: {
      outboxPendingJobs: outboxPending,
      outboxDeadLetters,
      satelliteMode: "SIMULATED_DEV",
      activeModelVersion: prodModel?.version ?? "v6.0-ensemble",
      modelDriftAlert: prodModel?.driftAlert ?? false,
    },
    stateAdapters,
  });
});

router.get("/mode", (_req, res) => {
  res.json({
    mode: degradedMode ? "DEGRADED" : "LOCAL_SPLIT",
    degraded: degradedMode,
    degradedReason: degradedMode ? degradedReason : null,
    runMode: "LOCAL_SPLIT",
    description: "Running as separate backend + frontend processes (Mode B — no Docker)",
    fallbacksActive: { kafka: true, cassandra: true, minio: true, redis: true },
    timestamp: new Date().toISOString(),
  });
});

router.post("/fallback/enable", async (req, res) => {
  degradedMode = true;
  degradedReason = req.body?.reason ?? "Manual admin override";
  return ok(res, { mode: "DEGRADED", reason: degradedReason });
});

router.post("/fallback/disable", async (_req, res) => {
  degradedMode = false;
  degradedReason = "";
  return ok(res, { mode: "NORMAL" });
});

// POST /api/v1/system/outbox/replay — sysop replay (spec 3.14)
router.post("/outbox/replay", async (_req, res) => {
  try {
    const pending = await db.query.eventOutbox.findMany({
      where: eq(eventOutbox.status, "FAILED"),
      orderBy: (e, { asc }) => [asc(e.createdAt)],
      limit: 50,
    });

    let replayed = 0;
    for (const event of pending) {
      await db.update(eventOutbox).set({ status: "PENDING", attemptCount: 0 })
        .where(eq(eventOutbox.id, event.id));
      replayed++;
    }

    return ok(res, { replayed, message: `${replayed} events re-queued for processing` });
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
});

router.get("/replay/:traceId", async (req, res) => {
  const { traceId } = req.params;
  try {
    const events = await db.query.auditLog.findMany({
      where: sql`${auditLog.claimId}::text = ${traceId} OR ${auditLog.id}::text = ${traceId}`,
      orderBy: [auditLog.createdAt],
    });

    if (!events.length) {
      return fail(res, "No audit events found for traceId", 404);
    }

    return ok(res, {
      traceId,
      eventCount: events.length,
      firstEvent: events[0]?.createdAt,
      lastEvent: events[events.length - 1]?.createdAt,
      replay: events.map((e) => ({
        step: e.stepName,
        actorType: e.actorType,
        actorId: e.actorId,
        reason: e.decisionReason,
        output: e.outputSnapshot,
        timestamp: e.createdAt,
      })),
    });
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
});

export { router as systemRouter };
