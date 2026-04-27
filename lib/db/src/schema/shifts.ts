import {
  pgTable,
  serial,
  text,
  timestamp,
  numeric,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const shiftsTable = pgTable(
  "shifts",
  {
    id: serial("id").primaryKey(),
    cashierName: text("cashier_name").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    totalSales: numeric("total_sales", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    ordersCount: integer("orders_count").notNull().default(0),
  },
  (table) => ({
    onlyOneActive: uniqueIndex("shifts_only_one_active_idx")
      .on(table.endedAt)
      .where(sql`${table.endedAt} IS NULL`),
  }),
);

export type ShiftRow = typeof shiftsTable.$inferSelect;
export type InsertShift = typeof shiftsTable.$inferInsert;
