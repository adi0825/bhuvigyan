import {
  pgTable,
  uuid,
  varchar,
  date,
  boolean,
  text,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const farmers = pgTable("farmers", {
  id: uuid("id").primaryKey().defaultRandom(),
  mobile: varchar("mobile", { length: 10 }).unique().notNull(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 10 }),
  digilockerId: varchar("digilocker_id", { length: 100 }),
  voterEpicNo: varchar("voter_epic_no", { length: 20 }),
  proteanVerifiedName: varchar("protean_verified_name", { length: 200 }),
  identityMatchScore: decimal("identity_match_score", { precision: 5, scale: 2 }),
  identitySource: varchar("identity_source", { length: 30 }),
  profilePhotoUrl: text("profile_photo_url"),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("en"),
  userId: uuid("user_id").references(() => users.id),
  isBlacklisted: boolean("is_blacklisted").default(false),
  blacklistReason: text("blacklist_reason"),
  blacklistedAt: timestamp("blacklisted_at", { withTimezone: true }),
  blacklistedBy: uuid("blacklisted_by"),
  carbonEligible: boolean("carbon_eligible").default(false),
  carbonEnrolled: boolean("carbon_enrolled").default(false),
  isDemo: boolean("is_demo").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const otps = pgTable("otps", {
  id: uuid("id").primaryKey().defaultRandom(),
  mobile: varchar("mobile", { length: 10 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  farmerId: uuid("farmer_id").references(() => farmers.id),
  adminId: uuid("admin_id"),
  token: varchar("token", { length: 512 }).unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertFarmerSchema = createInsertSchema(farmers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Farmer = typeof farmers.$inferSelect;
export type InsertFarmer = z.infer<typeof insertFarmerSchema>;
