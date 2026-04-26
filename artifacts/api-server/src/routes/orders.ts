import { Router, type IRouter } from "express";
import { and, eq, inArray, ne, notInArray, desc } from "drizzle-orm";
import {
  db,
  ordersTable,
  menuItemsTable,
  type OrderItemSnapshot,
  type OrderRow,
} from "@workspace/db";
import {
  ListOrdersQueryParams,
  ListOrdersResponse,
  CreateOrderBody,
  GetOrderParams,
  GetOrderResponse,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusResponse,
  ListOrdersByTableParams,
  ListOrdersByTableResponse,
} from "@workspace/api-zod";
import { emitOrderEvent, orderEvents, type OrderEventPayload } from "../lib/events";

const router: IRouter = Router();

router.get("/orders/stream", (req, res): void => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  res.write(`: connected\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 25000);

  const onEvent = (payload: OrderEventPayload): void => {
    res.write(`event: order\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  orderEvents.on("order", onEvent);

  req.on("close", () => {
    clearInterval(heartbeat);
    orderEvents.off("order", onEvent);
    res.end();
  });
});

function rowToOrder(row: OrderRow) {
  return {
    id: row.id,
    tableNumber: row.tableNumber,
    customerName: row.customerName ?? undefined,
    status: row.status,
    items: row.items,
    totalPrice: Number(row.totalPrice),
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/orders", async (req, res): Promise<void> => {
  const params = ListOrdersQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.status) {
    conditions.push(eq(ordersTable.status, params.data.status));
  }
  if (params.data.activeOnly) {
    conditions.push(notInArray(ordersTable.status, ["served", "cancelled"]));
  }

  const rows = await db
    .select()
    .from(ordersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt));

  res.json(ListOrdersResponse.parse(rows.map(rowToOrder)));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.items.length === 0) {
    res.status(400).json({ error: "Order must contain at least one item" });
    return;
  }

  const ids = parsed.data.items.map((i) => i.menuItemId);
  const menuRows = await db
    .select()
    .from(menuItemsTable)
    .where(inArray(menuItemsTable.id, ids));

  const menuById = new Map(menuRows.map((m) => [m.id, m]));
  const snapshots: OrderItemSnapshot[] = [];
  let total = 0;

  for (const item of parsed.data.items) {
    const menu = menuById.get(item.menuItemId);
    if (!menu) {
      res
        .status(400)
        .json({ error: `Menu item ${item.menuItemId} not found` });
      return;
    }
    const unitPrice = Number(menu.price);
    snapshots.push({
      menuItemId: menu.id,
      name: menu.name,
      quantity: item.quantity,
      unitPrice,
      notes: item.notes,
    });
    total += unitPrice * item.quantity;
  }

  const [row] = await db
    .insert(ordersTable)
    .values({
      tableNumber: parsed.data.tableNumber,
      customerName: parsed.data.customerName ?? null,
      status: "pending",
      items: snapshots,
      totalPrice: total.toFixed(2),
      notes: parsed.data.notes ?? null,
    })
    .returning();

  req.log.info({ orderId: row.id, table: row.tableNumber }, "Order created");
  emitOrderEvent({
    type: "created",
    orderId: row.id,
    tableNumber: row.tableNumber,
    status: row.status,
    at: new Date().toISOString(),
  });
  res.status(201).json(rowToOrder(row));
});

router.get("/orders/by-table/:tableNumber", async (req, res): Promise<void> => {
  const params = ListOrdersByTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.tableNumber, params.data.tableNumber),
        ne(ordersTable.status, "cancelled"),
      ),
    )
    .orderBy(desc(ordersTable.createdAt));

  res.json(ListOrdersByTableResponse.parse(rows.map(rowToOrder)));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(GetOrderResponse.parse(rowToOrder(row)));
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  emitOrderEvent({
    type: "updated",
    orderId: row.id,
    tableNumber: row.tableNumber,
    status: row.status,
    at: new Date().toISOString(),
  });

  res.json(UpdateOrderStatusResponse.parse(rowToOrder(row)));
});

export default router;
