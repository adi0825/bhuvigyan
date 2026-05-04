import { pgTable, uuid, varchar, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { claims } from "./claims";
import { users } from "./users";

export const verdictEnum = pgEnum('verdict', ['AUTO_APPROVE', 'REVIEW', 'FIELD_VISIT', 'AUTO_REJECT']);

export const decisions = pgTable('decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  claimId: uuid('claim_id').notNull().references(() => claims.id),
  verdict: verdictEnum('verdict').notNull(),
  scoreBand: varchar('score_band', { length: 20 }).notNull(),
  isHardOverride: boolean('is_hard_override').notNull().default(false),
  decidedBy: uuid('decided_by').references(() => users.id),
  reason: varchar('reason', { length: 1000 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
