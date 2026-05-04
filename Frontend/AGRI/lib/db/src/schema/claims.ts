import {
  pgTable,
  uuid,
  varchar,
  decimal,
  boolean,
  text,
  jsonb,
  date,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { farmers } from "./farmers";
import { udlrnMaster } from "./udlrn";
import { users } from "./users";

export const cscOperators = pgTable("csc_operators", {
  id: uuid("id").primaryKey().defaultRandom(),
  cscId: varchar("csc_id", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  mobile: varchar("mobile", { length: 10 }),
  email: varchar("email", { length: 200 }),
  districtId: varchar("district_id", { length: 15 }),
  isBlocked: boolean("is_blocked").default(false),
  blockedReason: text("blocked_reason"),
  blockedAt: timestamp("blocked_at", { withTimezone: true }),
  totalClaims: integer("total_claims").default(0),
  fraudFlagCount: integer("fraud_flag_count").default(0),
  lastClaimAt: timestamp("last_claim_at", { withTimezone: true }),
  isDemo: boolean("is_demo").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimNumber: varchar("claim_number", { length: 25 }).unique().notNull(),
  udlrn: varchar("udlrn", { length: 20 }).references(() => udlrnMaster.udlrn),
  farmerId: uuid("farmer_id").references(() => farmers.id),
  cscOperatorId: uuid("csc_operator_id").references(() => cscOperators.id),
  insurerCode: varchar("insurer_code", { length: 20 }),
  season: varchar("season", { length: 20 }).notNull(),
  seasonType: varchar("season_type", { length: 10 }).notNull(),
  damageType: varchar("damage_type", { length: 30 }).notNull(),
  damageDate: date("damage_date").notNull(),
  declaredSowingDate: date("declared_sowing_date").notNull(),
  declaredCrop: varchar("declared_crop", { length: 50 }).notNull(),
  claimAmountRequested: decimal("claim_amount_requested", { precision: 12, scale: 2 }),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 30 }).default("FILED"),
  pipelineStage: varchar("pipeline_stage", { length: 50 }),

  fraudScore: decimal("fraud_score", { precision: 5, scale: 2 }),
  fraudConfidence: decimal("fraud_confidence", { precision: 5, scale: 2 }),
  fraudFlags: jsonb("fraud_flags").default([]),
  flagBreakdown: jsonb("flag_breakdown").default({}),
  modelVersion: varchar("model_version", { length: 20 }),

  dataSource: varchar("data_source", { length: 30 }),
  cloudCoverPct: decimal("cloud_cover_pct", { precision: 5, scale: 2 }),
  ndviSowing: decimal("ndvi_sowing", { precision: 5, scale: 4 }),
  ndviClaim: decimal("ndvi_claim", { precision: 5, scale: 4 }),
  ndviLossPct: decimal("ndvi_loss_pct", { precision: 5, scale: 2 }),
  ndviTimeline: jsonb("ndvi_timeline"),
  sarVvDrop: decimal("sar_vv_drop", { precision: 5, scale: 2 }),
  sarVhDrop: decimal("sar_vh_drop", { precision: 5, scale: 2 }),
  landsatMaxNdvi: decimal("landsat_max_ndvi", { precision: 5, scale: 4 }),
  imdWeatherConfirmed: boolean("imd_weather_confirmed"),
  imdDisasterType: varchar("imd_disaster_type", { length: 30 }),

  trueColorUrl: text("true_color_url"),
  ndviMapUrl: text("ndvi_map_url"),
  lossMapUrl: text("loss_map_url"),
  ndviTimelineChartUrl: text("ndvi_timeline_chart_url"),
  sarImageUrl: text("sar_image_url"),

  kgisAreaHa: decimal("kgis_area_ha", { precision: 10, scale: 4 }),
  rtcAreaHa: decimal("rtc_area_ha", { precision: 10, scale: 4 }),
  areaDeltaPct: decimal("area_delta_pct", { precision: 5, scale: 2 }),

  rtcMutationDaysBefore: integer("rtc_mutation_days_before"),
  rtcCropBeforeMutation: varchar("rtc_crop_before_mutation", { length: 50 }),
  rtcCropAfterMutation: varchar("rtc_crop_after_mutation", { length: 50 }),

  evidencePdfUrl: text("evidence_pdf_url"),

  reviewerId: uuid("reviewer_id"),
  reviewNotes: text("review_notes"),
  rejectionReason: text("rejection_reason"),
  firAlertSent: boolean("fir_alert_sent").default(false),
  firAlertSentTo: varchar("fir_alert_sent_to", { length: 200 }),

  esignDocId: varchar("esign_doc_id", { length: 100 }),
  esignUrl: text("esign_url"),
  esignStatus: varchar("esign_status", { length: 20 }).default("NOT_INITIATED"),
  esignSignedAt: timestamp("esign_signed_at", { withTimezone: true }),

  dbtReferenceId: varchar("dbt_reference_id", { length: 100 }),
  dbtStatus: varchar("dbt_status", { length: 20 }),
  dbtTriggeredAt: timestamp("dbt_triggered_at", { withTimezone: true }),

  filedAt: timestamp("filed_at", { withTimezone: true }).defaultNow(),
  landVerifiedAt: timestamp("land_verified_at", { withTimezone: true }),
  bankVerifiedAt: timestamp("bank_verified_at", { withTimezone: true }),
  satelliteProcessedAt: timestamp("satellite_processed_at", { withTimezone: true }),
  scoredAt: timestamp("scored_at", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),

  crossStateFlag: boolean("cross_state_flag").default(false),
  expectedPeakNdvi: decimal("expected_peak_ndvi", { precision: 5, scale: 4 }),
  cropPhenologyMatch: boolean("crop_phenology_match"),
  isDemo: boolean("is_demo").default(false),

  traceId: varchar("trace_id", { length: 50 }).notNull().default(""),
});

export const udlrnSeasonLock = pgTable("udlrn_season_lock", {
  udlrn: varchar("udlrn", { length: 20 }).notNull(),
  seasonCode: varchar("season_code", { length: 20 }).notNull(),
  stateCode: varchar("state_code", { length: 2 }),
  claimId: uuid("claim_id"),
  lockedAt: timestamp("locked_at", { withTimezone: true }).defaultNow(),
});

export const satelliteJobs = pgTable("satellite_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: uuid("claim_id").references(() => claims.id),
  udlrn: varchar("udlrn", { length: 20 }),
  status: varchar("status", { length: 30 }).default("QUEUED"),
  polygonWkt: text("polygon_wkt"),
  sowingDate: date("sowing_date"),
  claimDate: date("claim_date"),
  geeTaskId: varchar("gee_task_id", { length: 100 }),
  result: jsonb("result"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type Claim = typeof claims.$inferSelect;
export type InsertClaim = typeof claims.$inferInsert;
export type CscOperator = typeof cscOperators.$inferSelect;
export type SatelliteJob = typeof satelliteJobs.$inferSelect;
export type ClaimDocument = typeof claimDocuments.$inferSelect;

export const claimDocuments = pgTable('claim_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  claimId: uuid('claim_id').notNull().references(() => claims.id),
  fileKey: varchar('file_key', { length: 500 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes'),
  contentHash: varchar('content_hash', { length: 64 }),
  uploadedBy: uuid('uploaded_by').references(() => cscOperators.id),
  createdAt: timestamp('created_at').defaultNow(),
});
