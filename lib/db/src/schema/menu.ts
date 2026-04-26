import {
  pgTable,
  serial,
  text,
  numeric,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const menuItemsTable = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  available: boolean("available").notNull().default(true),
  prepMinutes: integer("prep_minutes").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MenuItemRow = typeof menuItemsTable.$inferSelect;
export type InsertMenuItem = typeof menuItemsTable.$inferInsert;
