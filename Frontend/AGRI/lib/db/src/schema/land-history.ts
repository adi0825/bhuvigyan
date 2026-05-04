import { pgTable, uuid, date, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { farmers } from "./farmers";
import { udlrnMaster } from "./udlrn";

export const landOwnershipHistory = pgTable('land_ownership_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  udlrnId: varchar('udlrn_id', { length: 50 }).notNull().references(() => udlrnMaster.udlrn),
  farmerId: uuid('farmer_id').notNull().references(() => farmers.id),
  validFrom: date('valid_from').notNull(),
  validTo: date('valid_to'),
  mutationRef: varchar('mutation_ref', { length: 50 }),
  isSuspicious: boolean('is_suspicious').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
