import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { shiftsTable } from "./shifts";

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export type PaymentMethod = "cash" | "visa";

export interface OrderItemSnapshot {
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  tableNumber: integer("table_number").notNull(),
  customerName: text("customer_name"),
  status: text("status").notNull().default("pending"),
  items: jsonb("items").$type<OrderItemSnapshot[]>().notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  paymentMethod: text("payment_method").$type<PaymentMethod>(),
  shiftId: integer("shift_id").references(() => shiftsTable.id, {
    onDelete: "set null",
  }),
  cashierName: text("cashier_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OrderRow = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
