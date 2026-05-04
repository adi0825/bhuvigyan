import { pgTable, char, varchar, decimal, text } from "drizzle-orm/pg-core";

export const locationStates = pgTable("location_states", {
  code: char("code", { length: 2 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  landSystem: varchar("land_system", { length: 50 }),
  landApiBaseUrl: text("land_api_base_url"),
  apiType: varchar("api_type", { length: 30 }),
});

export const locationDistricts = pgTable("location_districts", {
  id: varchar("id", { length: 15 }).primaryKey(),
  stateCode: char("state_code", { length: 2 }).references(
    () => locationStates.code,
  ),
  name: varchar("name", { length: 100 }).notNull(),
  kgisDistrictCode: varchar("kgis_district_code", { length: 20 }),
  censusCode: varchar("census_code", { length: 10 }),
  lat: decimal("lat", { precision: 10, scale: 6 }),
  lng: decimal("lng", { precision: 10, scale: 6 }),
});

export const locationTaluks = pgTable("location_taluks", {
  id: varchar("id", { length: 20 }).primaryKey(),
  districtId: varchar("district_id", { length: 15 }).references(
    () => locationDistricts.id,
  ),
  name: varchar("name", { length: 100 }).notNull(),
  kgisTalukCode: varchar("kgis_taluk_code", { length: 20 }),
});

export const locationHoblis = pgTable("location_hoblis", {
  id: varchar("id", { length: 25 }).primaryKey(),
  talukId: varchar("taluk_id", { length: 20 }).references(
    () => locationTaluks.id,
  ),
  name: varchar("name", { length: 100 }).notNull(),
  kgisHobliCode: varchar("kgis_hobli_code", { length: 20 }),
});

export const locationVillages = pgTable("location_villages", {
  id: varchar("id", { length: 30 }).primaryKey(),
  hobliId: varchar("hobli_id", { length: 25 }).references(
    () => locationHoblis.id,
  ),
  name: varchar("name", { length: 100 }).notNull(),
  kgisVillageCode: varchar("kgis_village_code", { length: 20 }),
  pinCode: varchar("pin_code", { length: 6 }),
  centroidLat: decimal("centroid_lat", { precision: 10, scale: 8 }),
  centroidLng: decimal("centroid_lng", { precision: 11, scale: 8 }),
});

export type LocationState = typeof locationStates.$inferSelect;
export type LocationDistrict = typeof locationDistricts.$inferSelect;
export type LocationTaluk = typeof locationTaluks.$inferSelect;
export type LocationHobli = typeof locationHoblis.$inferSelect;
export type LocationVillage = typeof locationVillages.$inferSelect;
