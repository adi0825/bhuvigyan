import { pgTable, uuid, decimal, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { claims } from "./claims";

export const fraudScores = pgTable('fraud_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  claimId: uuid('claim_id').notNull().unique().references(() => claims.id),
  score: decimal('score', { precision: 5, scale: 2 }).notNull(),
  modelVersion: varchar('model_version', { length: 20 }).notNull(),
  explanation: jsonb('explanation').notNull(),
  ruleHits: jsonb('rule_hits').notNull().default('[]'),
  cropModelScore: decimal('crop_model_score', { precision: 5, scale: 2 }),
  anomalyModelScore: decimal('anomaly_model_score', { precision: 5, scale: 2 }),
  timelineModelScore: decimal('timeline_model_score', { precision: 5, scale: 2 }),
  ensembleWeights: jsonb('ensemble_weights'),
  scoredAt: timestamp('scored_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});
