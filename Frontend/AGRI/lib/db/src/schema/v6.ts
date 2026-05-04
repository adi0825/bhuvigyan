import {
  pgTable,
  uuid,
  varchar,
  char,
  boolean,
  jsonb,
  timestamp,
  decimal,
  integer,
  text,
  serial,
  date,
} from "drizzle-orm/pg-core";
import { claims } from "./claims";
import { udlrnMaster } from "./udlrn";
import { cscOperators } from "./claims";

export const eventOutbox = pgTable("event_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  traceId: varchar("trace_id", { length: 64 }).notNull(),
  eventType: varchar("event_type", { length: 80 }).notNull(),
  aggregateId: varchar("aggregate_id", { length: 100 }).notNull(),
  aggregateType: varchar("aggregate_type", { length: 50 }).notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 20 }).default("PENDING"),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(5),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }).defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const claimFeatureSnapshots = pgTable("claim_feature_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: uuid("claim_id").references(() => claims.id),
  modelVersion: varchar("model_version", { length: 20 }),
  featureVersion: varchar("feature_version", { length: 20 }).notNull().default("v1.0"),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).defaultNow(),

  ndviSowing: decimal("ndvi_sowing", { precision: 6, scale: 4 }),
  ndviClaim: decimal("ndvi_claim", { precision: 6, scale: 4 }),
  ndviLossPct: decimal("ndvi_loss_pct", { precision: 6, scale: 2 }),
  ndviPreSowing: decimal("ndvi_pre_sowing", { precision: 6, scale: 4 }),
  ndviPeak: decimal("ndvi_peak", { precision: 6, scale: 4 }),
  ndviBaseline10yr: decimal("ndvi_baseline_10yr", { precision: 6, scale: 4 }),
  ndviAnomalyScore: decimal("ndvi_anomaly_score", { precision: 6, scale: 4 }),
  sarVvDrop: decimal("sar_vv_drop", { precision: 6, scale: 2 }),
  sarVhDrop: decimal("sar_vh_drop", { precision: 6, scale: 2 }),
  sarFloodSignature: boolean("sar_flood_signature").default(false),
  cloudCoverPct: decimal("cloud_cover_pct", { precision: 6, scale: 2 }),
  dataSource: varchar("data_source", { length: 30 }),

  mutationDaysBefore: integer("mutation_days_before"),
  landUseType: varchar("land_use_type", { length: 50 }),
  kgisAreaHa: decimal("kgis_area_ha", { precision: 10, scale: 4 }),
  rtcAreaHa: decimal("rtc_area_ha", { precision: 10, scale: 4 }),
  areaDeltaPct: decimal("area_delta_pct", { precision: 6, scale: 2 }),
  tenancyStatus: varchar("tenancy_status", { length: 30 }),
  coOwnerCount: integer("co_owner_count").default(0),
  parcelBoundaryConfidence: decimal("parcel_boundary_confidence", { precision: 4, scale: 2 }),

  bankNameMatchScore: decimal("bank_name_match_score", { precision: 5, scale: 2 }),
  imdWeatherConfirmed: boolean("imd_weather_confirmed").default(false),
  weatherEventTypeMatch: boolean("weather_event_type_match").default(false),
  claimAmountRequested: decimal("claim_amount_requested", { precision: 12, scale: 2 }),
  districtRateCeiling: decimal("district_rate_ceiling", { precision: 12, scale: 2 }),
  overInsuranceRatio: decimal("over_insurance_ratio", { precision: 5, scale: 2 }),

  cscDailySubmissions: integer("csc_daily_submissions").default(0),
  cscWeeklySubmissions: integer("csc_weekly_submissions").default(0),
  cscFraudRate: decimal("csc_fraud_rate", { precision: 5, scale: 2 }),
  cscBulkFlag: boolean("csc_bulk_flag").default(false),
  sameBankClusterCount: integer("same_bank_cluster_count").default(0),
  crossStateFlag: boolean("cross_state_flag").default(false),
  duplicateActivePolicy: boolean("duplicate_active_policy").default(false),
  operatorRiskScore: decimal("operator_risk_score", { precision: 5, scale: 2 }),

  cropPhenologyMatch: boolean("crop_phenology_match").default(true),
  declaredSowingWindowValid: boolean("declared_sowing_window_valid").default(true),
  harvestDateConsistent: boolean("harvest_date_consistent").default(true),
  seasonalNdviPattern: varchar("seasonal_ndvi_pattern", { length: 20 }),
  daysFromSowingToClaim: integer("days_from_sowing_to_claim"),
  expectedGrowthPeriodDays: integer("expected_growth_period_days"),

  stateCode: char("state_code", { length: 2 }),
  stateRulePackVersion: varchar("state_rule_pack_version", { length: 10 }),
  activeRuleHits: jsonb("active_rule_hits").default([]),
  hardRuleOverride: varchar("hard_rule_override", { length: 50 }),
  confidenceScore: decimal("confidence_score", { precision: 4, scale: 2 }),
  ensembleScore: decimal("ensemble_score", { precision: 5, scale: 2 }),
  explainabilityReasons: jsonb("explainability_reasons").default([]),
});

export const ruleProfiles = pgTable("rule_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  stateCode: char("state_code", { length: 2 }),
  seasonType: varchar("season_type", { length: 10 }),
  profileName: varchar("profile_name", { length: 100 }).notNull(),
  autoApproveThreshold: integer("auto_approve_threshold").default(30),
  officerReviewThreshold: integer("officer_review_threshold").default(60),
  cceVisitThreshold: integer("cce_visit_threshold").default(80),
  autoRejectThreshold: integer("auto_reject_threshold").default(81),
  mutationDaysAlert: integer("mutation_days_alert").default(30),
  cscDailyBulkLimit: integer("csc_daily_bulk_limit").default(20),
  bankNameMatchMinScore: integer("bank_name_match_min_score").default(80),
  areaDeltaMaxPct: decimal("area_delta_max_pct", { precision: 5, scale: 2 }).default("20"),
  overInsuranceMaxRatio: decimal("over_insurance_max_ratio", { precision: 4, scale: 2 }).default("1.5"),
  minBaselineNdvi: decimal("min_baseline_ndvi", { precision: 5, scale: 4 }).default("0.15"),
  enableSarFallback: boolean("enable_sar_fallback").default(true),
  enableStateLandAdapter: boolean("enable_state_land_adapter").default(true),
  stateAdapterCacheTtlDays: integer("state_adapter_cache_ttl_days").default(90),
  extraRules: jsonb("extra_rules").default({}),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const cscActivityDaily = pgTable("csc_activity_daily", {
  id: uuid("id").primaryKey().defaultRandom(),
  cscOperatorId: uuid("csc_operator_id").references(() => cscOperators.id),
  activityDate: date("activity_date").notNull(),
  totalSubmissions: integer("total_submissions").default(0),
  approvedCount: integer("approved_count").default(0),
  rejectedCount: integer("rejected_count").default(0),
  reviewCount: integer("review_count").default(0),
  uniqueFarmers: integer("unique_farmers").default(0),
  uniqueUdlrns: integer("unique_udlrns").default(0),
  uniqueDistricts: integer("unique_districts").default(0),
  avgFraudScore: decimal("avg_fraud_score", { precision: 5, scale: 2 }),
  bulkPatternFlag: boolean("bulk_pattern_flag").default(false),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).default("0"),
  riskTier: varchar("risk_tier", { length: 10 }).default("LOW"),
  flaggedBySystem: boolean("flagged_by_system").default(false),
  flagReason: text("flag_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const stateAdapterCache = pgTable("state_adapter_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  udlrn: varchar("udlrn", { length: 20 }).references(() => udlrnMaster.udlrn),
  stateCode: char("state_code", { length: 2 }),
  adapterName: varchar("adapter_name", { length: 50 }),
  cacheKey: varchar("cache_key", { length: 200 }).notNull(),
  responseData: jsonb("response_data"),
  isStale: boolean("is_stale").default(false),
  confidence: decimal("confidence", { precision: 4, scale: 3 }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  freshness: varchar("freshness", { length: 10 }),
  adapterStatus: varchar("adapter_status", { length: 20 }).default("OK"),
  errorMessage: text("error_message"),
});

export const parcelMutations = pgTable("parcel_mutations", {
  id: uuid("id").primaryKey().defaultRandom(),
  udlrn: varchar("udlrn", { length: 20 }).references(() => udlrnMaster.udlrn),
  mutationType: varchar("mutation_type", { length: 50 }),
  mutationDate: date("mutation_date"),
  previousOwner: varchar("previous_owner", { length: 200 }),
  newOwner: varchar("new_owner", { length: 200 }),
  previousLandUse: varchar("previous_land_use", { length: 50 }),
  newLandUse: varchar("new_land_use", { length: 50 }),
  previousAreaHa: decimal("previous_area_ha", { precision: 10, scale: 4 }),
  newAreaHa: decimal("new_area_ha", { precision: 10, scale: 4 }),
  mutationNumber: varchar("mutation_number", { length: 50 }),
  registeredBy: varchar("registered_by", { length: 100 }),
  isSuspicious: boolean("is_suspicious").default(false),
  suspicionReason: text("suspicion_reason"),
  source: varchar("source", { length: 30 }).default("MANUAL"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const evidenceFiles = pgTable("evidence_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: uuid("claim_id").references(() => claims.id),
  fileType: varchar("file_type", { length: 30 }).notNull(),
  fileName: varchar("file_name", { length: 200 }),
  mimeType: varchar("mime_type", { length: 100 }),
  storageBackend: varchar("storage_backend", { length: 20 }).default("LOCAL"),
  storagePath: text("storage_path"),
  contentHash: varchar("content_hash", { length: 128 }),
  packageJson: jsonb("package_json"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow(),
  generatedBy: varchar("generated_by", { length: 50 }).default("SYSTEM"),
  isValid: boolean("is_valid").default(true),
  tamperFlag: boolean("tamper_flag").default(false),
  downloadCount: integer("download_count").default(0),
});

export const modelRegistry = pgTable("model_registry", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelName: varchar("model_name", { length: 100 }).notNull(),
  modelType: varchar("model_type", { length: 50 }).notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  description: text("description"),
  featureCount: integer("feature_count").default(47),
  featureSchema: jsonb("feature_schema").default([]),
  trainingDataSummary: jsonb("training_data_summary").default({}),
  metrics: jsonb("metrics").default({}),
  thresholds: jsonb("thresholds").default({}),
  isActive: boolean("is_active").default(false),
  isProduction: boolean("is_production").default(false),
  deployedAt: timestamp("deployed_at", { withTimezone: true }),
  deprecatedAt: timestamp("deprecated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: varchar("created_by", { length: 100 }),
  driftAlert: boolean("drift_alert").default(false),
  driftMetrics: jsonb("drift_metrics").default({}),
  totalClaimsScored: integer("total_claims_scored").default(0),
});

export type EventOutbox = typeof eventOutbox.$inferSelect;
export type ClaimFeatureSnapshot = typeof claimFeatureSnapshots.$inferSelect;
export type RuleProfile = typeof ruleProfiles.$inferSelect;
export type CscActivityDaily = typeof cscActivityDaily.$inferSelect;
export type StateAdapterCache = typeof stateAdapterCache.$inferSelect;
export type ParcelMutation = typeof parcelMutations.$inferSelect;
export type EvidenceFile = typeof evidenceFiles.$inferSelect;
export type ModelRegistry = typeof modelRegistry.$inferSelect;
