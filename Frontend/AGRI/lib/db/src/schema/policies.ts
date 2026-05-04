import { pgTable, uuid, varchar, date, decimal, boolean, timestamp, smallint } from "drizzle-orm/pg-core";
import { farmers } from "./farmers";
import { udlrnMaster } from "./udlrn";
import { users } from "./users";

export const policies = pgTable('policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  policyNumber: varchar('policy_number', { length: 50 }).notNull().unique(),
  farmerId: uuid('farmer_id').notNull().references(() => farmers.id),
  udlrnId: varchar('udlrn_id', { length: 50 }).notNull().references(() => udlrnMaster.udlrn),
  insurerId: uuid('insurer_id').references(() => users.id),
  season: varchar('season', { length: 20 }).notNull(),
  cropType: varchar('crop_type', { length: 50 }).notNull(),
  sowingDate: date('sowing_date').notNull(),
  coverageAmount: decimal('coverage_amount', { precision: 14, scale: 2 }).notNull(),
  premiumAmount: decimal('premium_amount', { precision: 14, scale: 2 }).notNull(),
  policyYear: smallint('policy_year').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
