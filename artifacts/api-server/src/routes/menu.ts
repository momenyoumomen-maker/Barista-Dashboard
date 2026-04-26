import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, menuItemsTable } from "@workspace/db";
import {
  ListMenuQueryParams,
  ListMenuResponse,
  CreateMenuItemBody,
  UpdateMenuItemParams,
  UpdateMenuItemBody,
  UpdateMenuItemResponse,
  DeleteMenuItemParams,
  ListCategoriesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function rowToMenuItem(row: typeof menuItemsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    category: row.category,
    price: Number(row.price),
    imageUrl: row.imageUrl ?? undefined,
    available: row.available,
    prepMinutes: row.prepMinutes,
    createdAt: row.createdAt,
  };
}

router.get("/menu/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      category: menuItemsTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(menuItemsTable)
    .groupBy(menuItemsTable.category)
    .orderBy(menuItemsTable.category);

  res.json(ListCategoriesResponse.parse(rows));
});

router.get("/menu", async (req, res): Promise<void> => {
  const params = ListMenuQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.category) {
    conditions.push(eq(menuItemsTable.category, params.data.category));
  }
  if (params.data.availableOnly) {
    conditions.push(eq(menuItemsTable.available, true));
  }

  const rows = await db
    .select()
    .from(menuItemsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(menuItemsTable.category, menuItemsTable.id);

  res.json(ListMenuResponse.parse(rows.map(rowToMenuItem)));
});

router.post("/menu", async (req, res): Promise<void> => {
  const parsed = CreateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(menuItemsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      category: parsed.data.category,
      price: String(parsed.data.price),
      imageUrl: parsed.data.imageUrl ?? null,
      available: parsed.data.available ?? true,
      prepMinutes: parsed.data.prepMinutes ?? 5,
    })
    .returning();

  res.status(201).json(rowToMenuItem(row));
});

router.patch("/menu/:id", async (req, res): Promise<void> => {
  const params = UpdateMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof menuItemsTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    updates.description = parsed.data.description;
  if (parsed.data.category !== undefined)
    updates.category = parsed.data.category;
  if (parsed.data.price !== undefined)
    updates.price = String(parsed.data.price);
  if (parsed.data.imageUrl !== undefined)
    updates.imageUrl = parsed.data.imageUrl;
  if (parsed.data.available !== undefined)
    updates.available = parsed.data.available;
  if (parsed.data.prepMinutes !== undefined)
    updates.prepMinutes = parsed.data.prepMinutes;

  if (Object.keys(updates).length === 0) {
    const [existing] = await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }
    res.json(UpdateMenuItemResponse.parse(rowToMenuItem(existing)));
    return;
  }

  const [row] = await db
    .update(menuItemsTable)
    .set(updates)
    .where(eq(menuItemsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  res.json(UpdateMenuItemResponse.parse(rowToMenuItem(row)));
});

router.delete("/menu/:id", async (req, res): Promise<void> => {
  const params = DeleteMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(menuItemsTable)
    .where(eq(menuItemsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
