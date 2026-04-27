# Alson Coffee Shop

## Overview

Real-time order management system for "ألسن كوفي / Alson Coffee" coffee shop.
Customers pick a table and order from the menu; baristas see orders live on a Kanban-style dashboard and advance their status.
Includes an admin view with today's stats, top-selling items, and full menu CRUD.

## Stack

- **Monorepo**: pnpm workspaces, Node 24, TypeScript 5.9
- **Backend**: Express 5 (`artifacts/api-server`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **API contract**: OpenAPI 3.1 (`lib/api-spec/openapi.yaml`) → Orval codegen → React Query hooks (`lib/api-client-react`) and Zod validators (`lib/api-zod`)
- **Frontend**: React + Vite + Tailwind v4 + shadcn/ui + framer-motion + wouter (`artifacts/mo2men`)
- **UI**: Arabic / RTL, Cairo + IBM Plex Sans Arabic fonts, espresso/cardamom warm palette

## Pages

- `/` — Customer table picker (1–20)
- `/menu/:tableNumber` — Browse menu by category, manage cart, place order
- `/order/:tableNumber` — Live status of this table's active orders
- `/cashier` — Cashier POS: name-login → live shift dashboard with sales/order tiles, a Tables panel (20 tables, occupied vs available, total per table), a "طلب جديد" full ordering dialog (table picker, searchable menu with qty +/-, cash/visa payment) → end-shift summary modal → returns to login for the next cashier. Orders are linked to the active shift; checking out a table marks all its active orders as served, applies cash/visa to any unpaid ones, and clears the table view.
- `/barista` — Live Kanban dashboard for staff (pending → preparing → ready), with audio chime on new orders
- `/admin` — **Login-protected** (Username `Alalson`, Password `alalson2026`) — today's stats, top items, menu management (CRUD). Auth is held in `sessionStorage` by `components/admin-auth.tsx` (`AdminAuthGate`).

## Real-Time Behavior

True push-based real-time via Server-Sent Events:
- `GET /api/orders/stream` (api-server) — SSE endpoint emitting `order` events on create/update.
- `artifacts/mo2men/src/hooks/use-order-events.ts` — frontend hook that subscribes, invalidates relevant React Query caches, and exposes an `onEvent` callback. Auto-reconnects on disconnect.
- Customer `/order/:tableNumber` shows a live "مباشر" badge and toasts when their order moves to preparing/ready/served.
- Barista `/barista` plays a chime + toast the instant a new order is created.
- Polling kept as a low-frequency safety net (15s) for queue summary / orders list.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/scripts run seed` — seed initial menu items + sample orders
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Schema

- `menu_items`: id, name (Arabic), description, category, price, imageUrl, available, prepMinutes, createdAt
- `orders`: id, tableNumber, customerName, status (pending|preparing|ready|served|cancelled), items (jsonb snapshot), totalPrice, notes, paymentMethod (cash|visa|null), shiftId (FK → shifts), cashierName (denormalized snapshot), createdAt, updatedAt
- `shifts`: id, cashierName, startedAt, endedAt (null while active), totalSales, ordersCount. A partial unique index enforces at most one active (endedAt IS NULL) shift at a time. New orders are auto-tagged with the active shift.

## Table reset / checkout

- `POST /api/tables/:tableNumber/checkout` — closes a table by setting `status = 'served'` on every active order for that table; optionally applies a `paymentMethod` to any unpaid ones (preserves existing payments via SQL `COALESCE`); returns `{ tableNumber, closedOrdersCount, totalCollected }`. Orders are NOT deleted — they remain in history for stats and reports.
- The customer-facing `GET /api/orders/by-table/:tableNumber` now filters out both `served` and `cancelled` orders, so the customer view becomes empty (table = available) the moment the cashier checks it out. SSE events are emitted per closed order so all live views update instantly.

## Shift management

- `POST /api/shifts` — start a shift (`{ cashierName }`); returns 409 if one is already active
- `GET /api/shifts/active` — returns `{ shift }` (null when no shift is active); `totalSales` and `ordersCount` are computed live from orders
- `POST /api/shifts/:id/end` — closes the shift, persists totals, returns full summary
- `GET /api/shifts/:id` — returns the shift summary at any time

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
