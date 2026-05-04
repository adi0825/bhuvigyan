import {
  pgTable,
  uuid,
  varchar,
  decimal,
  boolean,
  integer,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { farmers } from "./farmers";
import { udlrnMaster } from "./udlrn";

export const carbonProjects = pgTable("carbon_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  udlrn: varchar("udlrn", { length: 20 }).references(() => udlrnMaster.udlrn),
  farmerId: uuid("farmer_id").references(() => farmers.id),
  projectType: varchar("project_type", { length: 50 }),
  methodology: varchar("methodology", { length: 50 }),
  enrolmentDate: date("enrolment_date"),
  verificationDue: date("verification_due"),
  status: varchar("status", { length: 30 }).default("ENROLLED"),
  satelliteMonitoringEnabled: boolean("satellite_monitoring_enabled").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const carbonMeasurements = pgTable("carbon_measurements", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => carbonProjects.id),
  measurementDate: date("measurement_date").notNull(),
  ndviValue: decimal("ndvi_value", { precision: 5, scale: 4 }),
  soilOrganicCarbon: decimal("soil_organic_carbon", { precision: 8, scale: 4 }),
  estimatedSequestration: decimal("estimated_sequestration", { precision: 10, scale: 4 }),
  satelliteSource: varchar("satellite_source", { length: 30 }),
  measurementMethod: varchar("measurement_method", { length: 30 }),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const carbonCredits = pgTable("carbon_credits", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => carbonProjects.id),
  farmerId: uuid("farmer_id").references(() => farmers.id),
  udlrn: varchar("udlrn", { length: 20 }),
  creditsAmount: decimal("credits_amount", { precision: 10, scale: 4 }),
  vintageYear: integer("vintage_year"),
  registry: varchar("registry", { length: 50 }),
  registryId: varchar("registry_id", { length: 100 }),
  marketPriceUsd: decimal("market_price_usd", { precision: 8, scale: 2 }),
  farmerSharePct: decimal("farmer_share_pct", { precision: 5, scale: 2 }).default("75.0"),
  farmerPayoutInr: decimal("farmer_payout_inr", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 30 }).default("PENDING_VERIFICATION"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  soldAt: timestamp("sold_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const carbonPractices = pgTable("carbon_practices", {
  id: uuid("id").primaryKey().defaultRandom(),
  udlrn: varchar("udlrn", { length: 20 }),
  practiceType: varchar("practice_type", { length: 50 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  satelliteConfirmed: boolean("satellite_confirmed").default(false),
  fieldConfirmed: boolean("field_confirmed").default(false),
});

export type CarbonProject = typeof carbonProjects.$inferSelect;
export type CarbonCredit = typeof carbonCredits.$inferSelect;
