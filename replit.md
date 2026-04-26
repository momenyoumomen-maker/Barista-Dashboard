# MO2men Coffee Shop

## Overview

Real-time order management system for "مؤمن / MO2men" coffee shop.
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
- `/barista` — Live Kanban dashboard for staff (pending → preparing → ready), with audio chime on new orders
- `/admin` — Today's stats, top items, menu management (CRUD)

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
- `orders`: id, tableNumber, customerName, status (pending|preparing|ready|served|cancelled), items (jsonb snapshot), totalPrice, notes, createdAt, updatedAt

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
