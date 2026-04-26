import { Router, type IRouter } from "express";
import { and, eq, gte, sql, notInArray } from "drizzle-orm";
import {
  db,
  ordersTable,
  type OrderItemSnapshot,
} from "@workspace/db";
import {
  GetTodayStatsResponse,
  GetPopularItemsQueryParams,
  GetPopularItemsResponse,
  GetQueueSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

router.get("/stats/today", async (_req, res): Promise<void> => {
  const since = startOfToday();

  const todayRows = await db
    .select()
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, since));

  let revenue = 0;
  let activeOrders = 0;
  let servedOrders = 0;
  let totalPrepMinutes = 0;
  let prepCount = 0;

  for (const o of todayRows) {
    if (o.status === "cancelled") continue;
    revenue += Number(o.totalPrice);
    if (o.status === "served") {
      servedOrders += 1;
      const minutes =
        (o.updatedAt.getTime() - o.createdAt.getTime()) / 1000 / 60;
      if (minutes >= 0) {
        totalPrepMinutes += minutes;
        prepCount += 1;
      }
    } else {
      activeOrders += 1;
    }
  }

  const ordersCount = todayRows.filter((o) => o.status !== "cancelled").length;
  const averagePrepMinutes =
    prepCount > 0 ? Number((totalPrepMinutes / prepCount).toFixed(1)) : 0;

  res.json(
    GetTodayStatsResponse.parse({
      ordersCount,
      revenue: Number(revenue.toFixed(2)),
      activeOrders,
      averagePrepMinutes,
      servedOrders,
    }),
  );
});

router.get("/stats/popular", async (req, res): Promise<void> => {
  const params = GetPopularItemsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const limit = params.data.limit ?? 5;
  const since = startOfToday();

  const rows = await db
    .select({ items: ordersTable.items })
    .from(ordersTable)
    .where(
      and(
        gte(ordersTable.createdAt, since),
        notInArray(ordersTable.status, ["cancelled"]),
      ),
    );

  const byId = new Map<
    number,
    { menuItemId: number; name: string; category: string; quantitySold: number }
  >();

  for (const row of rows) {
    const items = (row.items ?? []) as OrderItemSnapshot[];
    for (const it of items) {
      const existing = byId.get(it.menuItemId);
      if (existing) {
        existing.quantitySold += it.quantity;
      } else {
        byId.set(it.menuItemId, {
          menuItemId: it.menuItemId,
          name: it.name,
          category: "",
          quantitySold: it.quantity,
        });
      }
    }
  }

  // Backfill category from menu items table
  const ids = Array.from(byId.keys());
  if (ids.length > 0) {
    const menu = await db.query.menuItemsTable.findMany({
      where: (m, { inArray }) => inArray(m.id, ids),
    });
    for (const m of menu) {
      const e = byId.get(m.id);
      if (e) e.category = m.category;
    }
  }

  const sorted = Array.from(byId.values())
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit);

  res.json(GetPopularItemsResponse.parse(sorted));
});

router.get("/stats/queue", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .where(notInArray(ordersTable.status, ["served", "cancelled"]));

  let pending = 0;
  let preparing = 0;
  let ready = 0;
  let oldest = 0;
  const now = Date.now();

  for (const r of rows) {
    if (r.status === "pending") pending += 1;
    else if (r.status === "preparing") preparing += 1;
    else if (r.status === "ready") ready += 1;
    const waited = Math.floor((now - r.createdAt.getTime()) / 1000);
    if (waited > oldest) oldest = waited;
  }

  res.json(
    GetQueueSummaryResponse.parse({
      pending,
      preparing,
      ready,
      oldestWaitingSeconds: oldest,
    }),
  );
});

export default router;
