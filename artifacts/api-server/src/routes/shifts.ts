import { Router, type IRouter } from "express";
import { eq, isNull, and, sql } from "drizzle-orm";
import { db, shiftsTable, ordersTable, type ShiftRow } from "@workspace/db";
import {
  StartShiftBody,
  GetShiftParams,
  GetShiftResponse,
  EndShiftParams,
  EndShiftResponse,
  GetActiveShiftResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function shiftToJson(row: ShiftRow) {
  return {
    id: row.id,
    cashierName: row.cashierName,
    startedAt: row.startedAt,
    endedAt: row.endedAt ?? null,
    totalSales: Number(row.totalSales),
    ordersCount: row.ordersCount,
  };
}

async function buildSummary(shiftId: number) {
  const [shift] = await db
    .select()
    .from(shiftsTable)
    .where(eq(shiftsTable.id, shiftId));

  if (!shift) return null;

  const orderRows = await db
    .select({
      status: ordersTable.status,
      totalPrice: ordersTable.totalPrice,
    })
    .from(ordersTable)
    .where(eq(ordersTable.shiftId, shiftId));

  let totalSales = 0;
  let servedOrders = 0;
  let cancelledOrders = 0;
  let countedOrders = 0;

  for (const o of orderRows) {
    if (o.status === "cancelled") {
      cancelledOrders += 1;
      continue;
    }
    countedOrders += 1;
    totalSales += Number(o.totalPrice);
    if (o.status === "served") servedOrders += 1;
  }

  const endTime = shift.endedAt ?? new Date();
  const durationSeconds = Math.max(
    0,
    Math.floor((endTime.getTime() - shift.startedAt.getTime()) / 1000),
  );

  return {
    id: shift.id,
    cashierName: shift.cashierName,
    startedAt: shift.startedAt,
    endedAt: shift.endedAt ?? null,
    totalSales: Number(totalSales.toFixed(2)),
    ordersCount: countedOrders,
    servedOrders,
    cancelledOrders,
    durationSeconds,
  };
}

export async function getActiveShiftRow(): Promise<ShiftRow | null> {
  const [row] = await db
    .select()
    .from(shiftsTable)
    .where(isNull(shiftsTable.endedAt))
    .limit(1);
  return row ?? null;
}

router.get("/shifts/active", async (_req, res): Promise<void> => {
  const row = await getActiveShiftRow();
  if (!row) {
    res.json(GetActiveShiftResponse.parse({ shift: null }));
    return;
  }
  // Recompute live counts from orders so the cashier dashboard always matches DB state.
  const orderAgg = await db
    .select({
      total: sql<string>`coalesce(sum(case when ${ordersTable.status} <> 'cancelled' then ${ordersTable.totalPrice} else 0 end), 0)`,
      count: sql<string>`coalesce(count(*) filter (where ${ordersTable.status} <> 'cancelled'), 0)`,
    })
    .from(ordersTable)
    .where(eq(ordersTable.shiftId, row.id));
  const live = {
    ...row,
    totalSales: Number(orderAgg[0]?.total ?? "0").toFixed(2),
    ordersCount: Number(orderAgg[0]?.count ?? "0"),
  };
  res.json(GetActiveShiftResponse.parse({ shift: shiftToJson(live) }));
});

router.post("/shifts", async (req, res): Promise<void> => {
  const parsed = StartShiftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const cashierName = parsed.data.cashierName.trim();
  if (!cashierName) {
    res.status(400).json({ error: "Cashier name is required" });
    return;
  }

  const existing = await getActiveShiftRow();
  if (existing) {
    res.status(409).json({
      error: `A shift is already active for ${existing.cashierName}`,
    });
    return;
  }

  const [row] = await db
    .insert(shiftsTable)
    .values({ cashierName })
    .returning();

  req.log.info({ shiftId: row.id, cashierName }, "Shift started");
  res.status(201).json(shiftToJson(row));
});

router.get("/shifts/:id", async (req, res): Promise<void> => {
  const params = GetShiftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const summary = await buildSummary(params.data.id);
  if (!summary) {
    res.status(404).json({ error: "Shift not found" });
    return;
  }
  res.json(GetShiftResponse.parse(summary));
});

router.post("/shifts/:id/end", async (req, res): Promise<void> => {
  const params = EndShiftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(shiftsTable)
    .where(eq(shiftsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Shift not found" });
    return;
  }

  // Compute totals before ending so they're persisted on the row.
  const summary = await buildSummary(params.data.id);
  if (!summary) {
    res.status(404).json({ error: "Shift not found" });
    return;
  }

  if (!existing.endedAt) {
    await db
      .update(shiftsTable)
      .set({
        endedAt: new Date(),
        totalSales: summary.totalSales.toFixed(2),
        ordersCount: summary.ordersCount,
      })
      .where(
        and(eq(shiftsTable.id, params.data.id), isNull(shiftsTable.endedAt)),
      );

    req.log.info(
      { shiftId: params.data.id, totalSales: summary.totalSales },
      "Shift ended",
    );
  }

  const finalSummary = await buildSummary(params.data.id);
  res.json(EndShiftResponse.parse(finalSummary));
});

export default router;
