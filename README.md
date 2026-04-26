# Alson Coffee — ألسن كوفي

Real-time order management system for **Alson Coffee** (ألسن كوفي), a bilingual Arabic/English (RTL) coffee shop application. Customers scan/select a table and order from the menu; baristas see live orders and advance their status; admins manage the menu and review daily stats — all updating instantly across every connected screen.

---

## Features

### For Customers
- **Pick a table** from a clean visual grid (tables 1–20).
- **Browse the menu** by category (hot drinks, cold drinks, desserts) with photos, prices in EGP, and Arabic descriptions.
- **Build a cart** with per-item quantities and special-instruction notes.
- **Place orders** that are submitted directly to the barista station.
- **Live order tracking** — the order card transitions from "في الانتظار" → "جاري التحضير" → "جاهز للتقديم" → "تم التقديم" in real time, with toast notifications at each step. No refresh required.

### For Baristas
- **Active Orders List** with one card per order, showing the table number, full item list (including per-item notes), elapsed time since placed, and a colored status indicator.
- **Status counters** at the top: new, preparing, ready, oldest waiting time.
- **Action buttons** to advance each order to the next status (Start Preparing → Mark Ready → Mark Served).
- **Real-time push** — new customer orders appear on the dashboard within milliseconds, accompanied by a chime and a toast.

### For Admins
- **Today's stats**: total sales, total orders, completed orders, average preparation time.
- **Top-selling items** of the day.
- **Full menu CRUD**: add, edit, toggle availability, and delete menu items, including image URLs and prep times.

### Branding
- Custom gold/espresso "Alson Coffee" logo and favicon.
- Cairo + IBM Plex Sans Arabic typography.
- Warm espresso/cardamom palette tuned for both light and dark modes.
- Mobile-first, fully RTL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces, Node 24, TypeScript 5.9 |
| Frontend | React 18, Vite, Tailwind CSS v4, shadcn/ui, framer-motion, wouter |
| Backend | Express 5 (TypeScript) |
| Database | PostgreSQL + Drizzle ORM |
| API contract | OpenAPI 3.1 → Orval codegen → React Query hooks + Zod validators |
| Realtime | Server-Sent Events (SSE) with auto-reconnect |
| Data fetching | TanStack Query (React Query) |

---

## Project Structure

```
.
├── artifacts/
│   ├── mo2men/          # Customer + staff web app (React + Vite)
│   └── api-server/      # Express API server
├── lib/
│   ├── api-spec/        # OpenAPI schema (source of truth)
│   ├── api-client-react/# Generated React Query hooks
│   ├── api-zod/         # Generated Zod request/response validators
│   └── db/              # Drizzle schema + DB client
├── scripts/             # Seed and maintenance scripts
└── README.md
```

---

## Getting Started

### Prerequisites
- Node 24+
- pnpm
- A PostgreSQL connection string in the `DATABASE_URL` environment variable

### Install
```bash
pnpm install
```

### Set up the database
Push the Drizzle schema to your Postgres instance and seed the menu:
```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed
```

### Run the apps
The project ships as a multi-service workspace. In Replit, the configured workflows start everything automatically. Locally you can run them in separate terminals:

```bash
# API server (Express, port 8080)
pnpm --filter @workspace/api-server run dev

# Web app (Vite dev server)
pnpm --filter @workspace/mo2men run dev
```

The web app proxies API calls under `/api` to the Express server.

### Build for production
```bash
pnpm run build
```

### Other useful commands
```bash
pnpm run typecheck                                # full workspace typecheck
pnpm --filter @workspace/api-spec run codegen     # regenerate hooks + Zod after editing the OpenAPI spec
```

---

## App Routes

| Path | Purpose |
|---|---|
| `/` | Customer table picker |
| `/menu/:tableNumber` | Browse menu and build cart |
| `/order/:tableNumber` | Live status of this table's active orders |
| `/barista` | Active orders list with action buttons (staff) |
| `/admin` | Daily stats, top items, menu management |

## Key API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/menu` | List all menu items |
| GET | `/api/menu/categories` | List categories |
| POST | `/api/menu` | Create menu item (admin) |
| PATCH/DELETE | `/api/menu/:id` | Update / delete menu item |
| GET | `/api/orders?activeOnly=true` | List active orders |
| GET | `/api/orders/by-table/:tableNumber` | Orders for a single table |
| POST | `/api/orders` | Customer places an order |
| PATCH | `/api/orders/:id` | Advance order status |
| GET | `/api/orders/stream` | **SSE** — live order events |
| GET | `/api/stats/today` | Today's sales stats |
| GET | `/api/stats/popular` | Most-ordered items today |
| GET | `/api/stats/queue` | Live queue summary for the dashboard |

---

## Real-Time Architecture

Updates flow through Server-Sent Events:

1. The API server holds an in-memory event bus.
2. `POST /api/orders` and `PATCH /api/orders/:id` emit an `order` event.
3. `GET /api/orders/stream` is an SSE endpoint that pushes those events to all connected clients with periodic heartbeats.
4. The frontend hook `useOrderEvents` subscribes to the stream, invalidates the relevant React Query caches, and triggers UI toasts and animations. It auto-reconnects on disconnect.

The customer's order page and the barista dashboard both consume this stream, so a status change made by the barista appears on the customer's screen within milliseconds — no polling delay, no page refresh.

---

## Database Schema

- **`menu_items`** — `id`, `name` (Arabic), `description`, `category`, `price`, `imageUrl`, `available`, `prepMinutes`, `createdAt`
- **`orders`** — `id`, `tableNumber`, `customerName`, `status` (`pending` | `preparing` | `ready` | `served` | `cancelled`), `items` (JSONB snapshot of name/quantity/unitPrice/notes at order time), `totalPrice`, `notes`, `createdAt`, `updatedAt`
