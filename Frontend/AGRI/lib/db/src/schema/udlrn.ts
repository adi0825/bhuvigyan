import {
  pgTable,
  uuid,
  varchar,
  char,
  decimal,
  boolean,
  text,
  jsonb,
  date,
  timestamp,
  customType,
} from "drizzle-orm/pg-core";
import { farmers } from "./farmers";
import { locationDistricts, locationTaluks, locationHoblis, locationVillages } from "./location";

const geometry = customType<{ data: string }>({
  dataType() {
    return "geometry";
  },
});

export const udlrnMaster = pgTable("udlrn_master", {
  udlrn: varchar("udlrn", { length: 20 }).primaryKey(),
  farmerId: uuid("farmer_id").references(() => farmers.id),
  stateCode: char("state_code", { length: 2 }),
  districtId: varchar("district_id", { length: 15 }).references(
    () => locationDistricts.id,
  ),
  talukId: varchar("taluk_id", { length: 20 }).references(
    () => locationTaluks.id,
  ),
  hobliId: varchar("hobli_id", { length: 25 }).references(
    () => locationHoblis.id,
  ),
  villageId: varchar("village_id", { length: 30 }).references(
    () => locationVillages.id,
  ),
  kgisVillageCode: varchar("kgis_village_code", { length: 20 }),
  kgisDistrictCode: varchar("kgis_district_code", { length: 20 }),
  kgisTalukCode: varchar("kgis_taluk_code", { length: 20 }),
  kgisHobliCode: varchar("kgis_hobli_code", { length: 20 }),
  surveyNumber: varchar("survey_number", { length: 20 }).notNull(),
  kgisAreaHa: decimal("kgis_area_ha", { precision: 10, scale: 4 }),
  rtcAreaHa: decimal("rtc_area_ha", { precision: 10, scale: 4 }),
  landOwnerName: varchar("land_owner_name", { length: 200 }),
  coOwners: jsonb("co_owners").default([]),
  tenancyStatus: varchar("tenancy_status", { length: 30 }),
  mutationDate: date("mutation_date"),
  landUseType: varchar("land_use_type", { length: 50 }),
  soilType: varchar("soil_type", { length: 50 }),
  waterSource: varchar("water_source", { length: 50 }),
  plotPolygonWkt: text("plot_polygon_wkt"),
  centroidLat: decimal("centroid_lat", { precision: 10, scale: 8 }),
  centroidLng: decimal("centroid_lng", { precision: 11, scale: 8 }),
  landsatBaselineNdvi: decimal("landsat_baseline_ndvi", { precision: 5, scale: 4 }),
  historicalCrops: jsonb("historical_crops").default([]),
  payoutAccountNo: varchar("payout_account_no", { length: 20 }),
  payoutIfsc: varchar("payout_ifsc", { length: 11 }),
  payoutBankName: varchar("payout_bank_name", { length: 100 }),
  payoutBranchName: varchar("payout_branch_name", { length: 100 }),
  bankNameMatchScore: decimal("bank_name_match_score", { precision: 5, scale: 2 }),
  rtcRaw: jsonb("rtc_raw"),
  isFrozen: boolean("is_frozen").default(false),
  frozenReason: text("frozen_reason"),
  frozenAt: timestamp("frozen_at", { withTimezone: true }),
  frozenBy: uuid("frozen_by"),
  boundaryGeoJson: text("boundary_geo_json"),
  isFraudFlagged: boolean("is_fraud_flagged").default(false),
  fraudFlagReason: text("fraud_flag_reason"),
  carbonScore: decimal("carbon_score", { precision: 5, scale: 2 }).default("0"),
  carbonCreditsEarned: decimal("carbon_credits_earned", { precision: 10, scale: 4 }).default("0"),
  isDemo: boolean("is_demo").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type UdlrnMaster = typeof udlrnMaster.$inferSelect;
export type InsertUdlrnMaster = typeof udlrnMaster.$inferInsert;
