import { db } from "@workspace/db";
import { eventOutbox, claims } from "@workspace/db";
import { and, eq, lte, sql } from "drizzle-orm";
import { logger } from "./logger";
import { processClaim } from "./claim-pipeline";

let schedulerRunning = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

const POLL_INTERVAL_MS = 30_000;
const BACKOFF_MINUTES = [1, 2, 5, 10, 30];

async function processOnePendingEvent(event: typeof eventOutbox.$inferSelect) {
  const nextAttempt = (event.attempts ?? 0) + 1;
  const backoffMin = BACKOFF_MINUTES[Math.min(nextAttempt - 1, BACKOFF_MINUTES.length - 1)] ?? 30;
  const nextRetry = new Date(Date.now() + backoffMin * 60_000);

  try {
    switch (event.eventType) {
      case "CLAIM_PIPELINE_STARTED": {
        const payload = event.payload as { claimId?: string };
        if (!payload.claimId) break;

        const claim = await db.query.claims.findFirst({ where: eq(claims.id, payload.claimId) });
        if (!claim) break;

        if (claim.status === "SUBMITTED" || claim.status === "FILED") {
          logger.info({ claimId: payload.claimId, traceId: event.traceId }, "Outbox: replaying stalled claim");
          await processClaim(payload.claimId);
        } else {
          await db.update(eventOutbox)
            .set({ status: "PROCESSED", processedAt: new Date(), attempts: nextAttempt })
            .where(eq(eventOutbox.id, event.id));
        }
        break;
      }

      case "claim.land.verified":
      case "claim.bank.verified":
      case "satellite.job.requested":
      case "satellite.job.completed":
      case "claim.scored":
      case "claim.review.queued":
      case "claim.cce.assigned":
      case "claim.auto.rejected":
      case "claim.approved":
      case "claim.rejected":
      case "claim.filed":
      case "claim.pre-validation":
        await db.update(eventOutbox)
          .set({ status: "PROCESSED", processedAt: new Date(), attempts: nextAttempt })
          .where(eq(eventOutbox.id, event.id));
        break;

      default:
        logger.warn({ eventType: event.eventType, id: event.id }, "Outbox: unknown event type — marking processed");
        await db.update(eventOutbox)
          .set({ status: "PROCESSED", processedAt: new Date(), attempts: nextAttempt })
          .where(eq(eventOutbox.id, event.id));
    }
  } catch (err) {
    logger.error({ err, id: event.id, eventType: event.eventType, attempt: nextAttempt }, "Outbox: event processing failed");
    const maxAttempts = event.maxAttempts ?? 5;
    const newStatus = nextAttempt >= maxAttempts ? "FAILED" : "PENDING";
    await db.update(eventOutbox)
      .set({
        status: newStatus,
        attempts: nextAttempt,
        nextRetryAt: nextRetry,
        errorMessage: String(err),
      })
      .where(eq(eventOutbox.id, event.id));
  }
}

async function pollOutbox() {
  if (schedulerRunning) return;
  schedulerRunning = true;
  try {
    const pending = await db.query.eventOutbox.findMany({
      where: and(
        eq(eventOutbox.status, "PENDING"),
        lte(eventOutbox.nextRetryAt, new Date()),
      ),
      orderBy: (o, { asc }) => [asc(o.createdAt)],
      limit: 10,
    });

    if (pending.length > 0) {
      logger.info({ count: pending.length }, "Outbox: processing pending events");
      for (const event of pending) {
        await processOnePendingEvent(event);
      }
    }

    const [staleCount] = await db
      .select({ cnt: sql<number>`COUNT(*)` })
      .from(eventOutbox)
      .where(
        and(
          eq(eventOutbox.status, "PENDING"),
          sql`attempts >= max_attempts`,
        ),
      );
    if (Number(staleCount?.cnt ?? 0) > 0) {
      await db.update(eventOutbox)
        .set({ status: "FAILED", errorMessage: "Max attempts exceeded" })
        .where(and(eq(eventOutbox.status, "PENDING"), sql`attempts >= max_attempts`));
    }
  } catch (err) {
    logger.error({ err }, "Outbox scheduler poll error");
  } finally {
    schedulerRunning = false;
  }
}

export function startOutboxScheduler() {
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Outbox scheduler starting");
  pollOutbox().catch((e) => logger.error({ e }, "Initial outbox poll failed"));
  intervalHandle = setInterval(() => {
    pollOutbox().catch((e) => logger.error({ e }, "Outbox poll failed"));
  }, POLL_INTERVAL_MS);
}

export function stopOutboxScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("Outbox scheduler stopped");
  }
}
