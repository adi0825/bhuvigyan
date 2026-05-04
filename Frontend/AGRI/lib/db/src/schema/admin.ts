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
  date,
  text,
  serial,
} from "drizzle-orm/pg-core";
import { farmers } from "./farmers";
import { claims } from "./claims";
import { udlrnMaster } from "./udlrn";
import { locationDistricts } from "./location";

export const adminOfficers = pgTable("admin_officers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 200 }).unique().notNull(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  mobile: varchar("mobile", { length: 10 }),
  role: varchar("role", { length: 30 }).notNull(),
  stateCode: char("state_code", { length: 2 }),
  districtId: varchar("district_id", { length: 15 }),
  talukId: varchar("taluk_id", { length: 20 }),
  jurisdiction: jsonb("jurisdiction"),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  totpSecret: varchar("totp_secret", { length: 100 }),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  isDemo: boolean("is_demo").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insurerAccounts = pgTable("insurer_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  insurerCode: varchar("insurer_code", { length: 20 }).unique().notNull(),
  insurerName: varchar("insurer_name", { length: 200 }).notNull(),
  states: jsonb("states").default([]),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const cceVisits = pgTable("cce_visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: uuid("claim_id").references(() => claims.id),
  inspectorId: uuid("inspector_id").references(() => adminOfficers.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow(),
  dueBy: timestamp("due_by", { withTimezone: true }),
  visitedAt: timestamp("visited_at", { withTimezone: true }),
  gpsCheckinLat: decimal("gps_checkin_lat", { precision: 10, scale: 8 }),
  gpsCheckinLng: decimal("gps_checkin_lng", { precision: 11, scale: 8 }),
  distanceFromPlotM: decimal("distance_from_plot_m", { precision: 10, scale: 2 }),
  actualAreaHa: decimal("actual_area_ha", { precision: 10, scale: 4 }),
  actualCropCondition: varchar("actual_crop_condition", { length: 50 }),
  yieldEstimateKgHa: decimal("yield_estimate_kg_ha", { precision: 10, scale: 2 }),
  photoUrls: jsonb("photo_urls").default([]),
  inspectorNotes: text("inspector_notes"),
  cceVerdict: varchar("cce_verdict", { length: 30 }),
  contradictsSatellite: boolean("contradicts_satellite").default(false),
  status: varchar("status", { length: 20 }).default("ASSIGNED"),
  priority: varchar("priority", { length: 10 }).default("MEDIUM"),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  farmerId: uuid("farmer_id").references(() => farmers.id),
  recipientMobile: varchar("recipient_mobile", { length: 10 }),
  claimId: uuid("claim_id"),
  notificationType: varchar("notification_type", { length: 50 }),
  title: varchar("title", { length: 200 }),
  message: text("message").notNull(),
  channel: varchar("channel", { length: 20 }).default("IN_APP"),
  whatsappStatus: varchar("whatsapp_status", { length: 20 }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const claimAppeals = pgTable("claim_appeals", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: uuid("claim_id").references(() => claims.id),
  farmerId: uuid("farmer_id").references(() => farmers.id),
  appealText: text("appeal_text").notNull(),
  photoUrls: jsonb("photo_urls").default([]),
  status: varchar("status", { length: 20 }).default("SUBMITTED"),
  reviewedBy: uuid("reviewed_by"),
  reviewNotes: text("review_notes"),
  outcome: varchar("outcome", { length: 30 }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const dbtPayouts = pgTable("dbt_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: uuid("claim_id").references(() => claims.id).unique(),
  udlrn: varchar("udlrn", { length: 20 }),
  beneficiaryName: varchar("beneficiary_name", { length: 200 }),
  accountNo: varchar("account_no", { length: 20 }),
  ifsc: varchar("ifsc", { length: 11 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  schemeCode: varchar("scheme_code", { length: 20 }).default("PMFBY"),
  pfmsReferenceId: varchar("pfms_reference_id", { length: 100 }),
  pfmsStatus: varchar("pfms_status", { length: 30 }).default("PENDING"),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").default(0),
});

export const fraudHeatmapDaily = pgTable("fraud_heatmap_daily", {
  districtId: varchar("district_id", { length: 15 }).notNull(),
  computedDate: date("computed_date").notNull(),
  totalClaims: integer("total_claims").default(0),
  fraudClaims: integer("fraud_claims").default(0),
  approvedClaims: integer("approved_claims").default(0),
  pendingClaims: integer("pending_claims").default(0),
  fraudRate: decimal("fraud_rate", { precision: 5, scale: 2 }).default("0"),
  totalAmountRisk: decimal("total_amount_risk", { precision: 15, scale: 2 }).default("0"),
  amountSaved: decimal("amount_saved", { precision: 15, scale: 2 }).default("0"),
  topFraudType: varchar("top_fraud_type", { length: 50 }),
  topFraudFlag: varchar("top_fraud_flag", { length: 50 }),
});

export const cropPhenologyCalendar = pgTable("crop_phenology_calendar", {
  id: serial("id").primaryKey(),
  cropType: varchar("crop_type", { length: 50 }).notNull(),
  seasonType: varchar("season_type", { length: 10 }).notNull(),
  sowingMonthStart: integer("sowing_month_start"),
  sowingMonthEnd: integer("sowing_month_end"),
  harvestMonthStart: integer("harvest_month_start"),
  harvestMonthEnd: integer("harvest_month_end"),
  peakNdviMonth: integer("peak_ndvi_month"),
  expectedPeakNdvi: decimal("expected_peak_ndvi", { precision: 4, scale: 2 }),
  minHealthyNdvi: decimal("min_healthy_ndvi", { precision: 4, scale: 2 }),
  stateCode: char("state_code", { length: 2 }),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: uuid("claim_id"),
  udlrn: varchar("udlrn", { length: 20 }),
  stepName: varchar("step_name", { length: 100 }).notNull(),
  actorId: varchar("actor_id", { length: 100 }),
  actorType: varchar("actor_type", { length: 30 }),
  inputSnapshot: jsonb("input_snapshot"),
  outputSnapshot: jsonb("output_snapshot"),
  modelVersion: varchar("model_version", { length: 20 }),
  satelliteImageUrls: jsonb("satellite_image_urls"),
  decisionReason: text("decision_reason"),
  signature: varchar("signature", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type AdminOfficer = typeof adminOfficers.$inferSelect;
export type InsertAdminOfficer = typeof adminOfficers.$inferInsert;
export type CceVisit = typeof cceVisits.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ClaimAppeal = typeof claimAppeals.$inferSelect;
export type DbtPayout = typeof dbtPayouts.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
