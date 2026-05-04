import { db } from "@workspace/db";
import { eventOutbox } from "@workspace/db";
import { eq, lt, and, sql } from "drizzle-orm";

export interface OutboxEvent {
  id: string;
  eventType: string;
  payload: Record<string, any>;
  createdAt: Date;
  processedAt?: Date;
}

export interface EventHandler {
  handle(event: OutboxEvent): Promise<void>;
}

const handlers: Map<string, EventHandler> = new Map();

export function registerHandler(eventType: string, handler: EventHandler): void {
  handlers.set(eventType, handler);
}

async function processEvent(event: typeof eventOutbox.$inferSelect): Promise<void> {
  const handler = handlers.get(event.eventType);
  if (!handler) {
    console.warn(`No handler for event type: ${event.eventType}`);
    return;
  }

  try {
    await handler.handle({
      id: event.id,
      eventType: event.eventType,
      payload: event.payload as Record<string, any>,
      createdAt: event.createdAt,
      processedAt: event.processedAt ?? undefined,
    });

    await db.update(eventOutbox)
      .set({ processedAt: new Date() })
      .where(eq(eventOutbox.id, event.id));

    console.log(`Processed event: ${event.eventType} (${event.id})`);
  } catch (error) {
    console.error(`Failed to process event ${event.id}:`, error);
    
    await db.update(eventOutbox)
      .set({ 
        retryCount: (event.retryCount ?? 0) + 1,
        lastError: error instanceof Error ? error.message : String(error),
      })
      .where(eq(eventOutbox.id, event.id));
  }
}

let isRunning = false;
let pollInterval: NodeJS.Timeout | null = null;

export async function pollOutbox(batchSize: number = 10): Promise<number> {
  if (isRunning) {
    return 0;
  }

  isRunning = true;
  let processedCount = 0;

  try {
    const events = await db.query.eventOutbox.findMany({
      where: and(
        eq(eventOutbox.status, "PENDING"),
        sql`${eventOutbox.retryCount} < 5`
      ),
      limit: batchSize,
      orderBy: (outbox, { asc }) => [asc(outbox.createdAt)],
    });

    for (const event of events) {
      await processEvent(event);
      processedCount++;
    }

    return processedCount;
  } catch (error) {
    console.error("Error polling outbox:", error);
    return processedCount;
  } finally {
    isRunning = false;
  }
}

export function startOutboxPoller(intervalMs: number = 5000, batchSize: number = 10): void {
  if (pollInterval) {
    console.warn("Outbox poller already running");
    return;
  }

  console.log(`Starting outbox poller (interval: ${intervalMs}ms, batch: ${batchSize})`);
  
  pollInterval = setInterval(async () => {
    try {
      const count = await pollOutbox(batchSize);
      if (count > 0) {
        console.log(`Processed ${count} outbox events`);
      }
    } catch (error) {
      console.error("Outbox poller error:", error);
    }
  }, intervalMs);
}

export function stopOutboxPoller(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log("Outbox poller stopped");
  }
}

export async function processOutboxOnce(batchSize: number = 10): Promise<number> {
  return pollOutbox(batchSize);
}
