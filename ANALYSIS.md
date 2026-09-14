# Restaurant Real-Time QR POS - Complete Analysis

**Date:** 2026-09-14 | **Version:** 1.0 | **Status:** V1 Scope Approved

## 1. PRD Summary
- **Product:** Modern responsive restaurant POS + QR ordering for single-branch, multi-branch ready.
- **Flow:** Scan QR → Menu → Order → Real-Time Alerts (Owner/Cashier/Kitchen) → Prepare → Live Tracking → Additional Orders → Bill → Payment (Cash/UPI/Split) → 58mm Print + Dynamic UPI QR → Complete → Table Available
- **Roles:**
  - **Owner:** Full admin (dashboard, tables, QR, menu, billing, waiter, kitchen, staff, reports, settings, UPI, tax, printing)
  - **Cashier:** Dashboard, orders, tables view, billing, payments, printing, waiter, kitchen (no admin)
  - **Kitchen:** KDS only (NEW/PREPARING/READY, sound)
  - **Customer:** No account, QR token based session

- **Key Rules:**
  - Each table unique QR
  - First order activates session
  - Additional orders same session
  - Table occupied till bill completed
  - Order status: NEW → CONFIRMED → PREPARING → READY → SERVED
  - Waiter bell with duplicate prevention
  - Billing aggregates unpaid orders of active session
  - GST toggleable
  - UPI QR Rules (Critical):
    - Cash 1500 → QR 1500
    - UPI 1500 → QR 1500
    - Cash 500 + UPI 1000 → QR 1000 (split => UPI portion)
    - Cash-only still prints full UPI QR

## 2. Architecture
- **Style:** Modular Monolith (V1) - simple deployment, clear domain boundaries for future extraction
- **Stack:** Next.js App Router, React, TypeScript strict, Tailwind, Framer Motion, PostgreSQL/Supabase, Zod, QR lib, Supabase Realtime, Storage, 58mm print CSS
- **Domains:** Auth, Restaurant, Branch, Users/Roles, Tables, QR, Table Sessions, Menu, Orders, Waiter Requests, Kitchen, Billing, Payments, UPI, Printing, Notifications, Reports, Settings
- **Routes:** /t/[token], /login, /owner/*, /cashier/*, /kitchen/display
- **Realtime Events:** order.created/confirmed/preparing/ready/served, waiter_request.created/resolved, table.status_changed, bill.created/completed
- **Transaction Boundaries:**
  - First order: validate QR → session → items → create order → activate session/table → commit → emit
  - Bill: load unpaid → totals/tax → create bill → BILL_PENDING → commit
  - Complete: validate payments → mark paid → close session → release table → commit
- **Concurrency:** Transactions, unique constraints, row locking, idempotency keys

## 3. Database Design
- **Principle:** UUID PKs, human-friendly order/bill numbers, restaurant+branch scoping, server source of truth, auditable finance, menu price snapshot
- **Tables (19):** restaurants, branches, users, restaurant_settings, payment_settings, tax_settings, tables, qr_tokens, table_sessions, categories, menu_items, orders, order_items, order_status_history, waiter_requests, bills, bill_orders, payments, notifications, printer_settings, audit_logs
- **Key Constraints:**
  - One active session per table
  - Unique active QR per table
  - Unique order/bill numbers per branch
  - quantity >0, money non-negative
  - Payment sum = bill total before completion
  - Duplicate waiter prevention while OPEN
  - client_request_id unique per session
- **Indexes:** tables(branch_id,status), qr_tokens(token_hash), table_sessions(table_id,status), orders(table_session_id,status), etc.
- **RLS:** Tenant isolation mandatory

## 4. Business Rules (BR-001 to BR-030)
- BR-001/002: Unique QR, disabled table no orders
- BR-003/004/005: First order opens session, same session additional, occupied till bill completed
- BR-006/007: BILL_PENDING no new orders, only completed billing releases table
- BR-008/009: Unavailable cannot add, price snapshot
- BR-010: Idempotency via client_request_id
- BR-011: Valid lifecycle NEW→SERVED
- BR-012/013: Only one OPEN waiter per session, staff resolves
- BR-014: Bill aggregates unpaid session orders
- BR-015: GST only when enabled
- BR-016/017: Payment total must equal bill, split valid only when sum=total
- BR-018/019/020: Full cash QR = full, full UPI = full, split = UPI portion
- BR-021: UPI config required
- BR-022/023: 58mm thermal, print failure not delete bill/order
- BR-024/025/026: Server authority, UI not auth, tenant isolation
- BR-027/028: Realtime without refresh, sound + visual
- BR-029/030: Bill completion closes session, audit critical actions

## 5. API Spec
- Principles: Validate server-side, RBAC server-side, restaurant/branch scoping, never trust client totals, idempotency, typed errors
- Auth: POST /api/auth/login/logout, GET /me (staff only)
- Customer: GET /api/customer/table/{token}, /menu, /session (token derived)
- Orders: POST /api/orders (items, notes, session, idempotency), GET /{id}, PATCH status, GET session orders
- Waiter: POST /api/waiter-requests, GET, PATCH {id}
- Tables: Owner CRUD + QR regenerate/download, Cashier read-only
- Menu: Owner categories/items CRUD
- Billing: POST /api/bills, GET {id}, POST payments, POST complete, POST print (Owner/Cashier)
- Payment payload: {cash, upi} validated server
- UPI QR: GET /api/bills/{id}/upi-qr (split=>UPI amount else full)
- Kitchen: GET /api/kitchen/orders, PATCH status, POST print
- Error format: {error:{code,message,details}} with 200/201/400/401/403/404/409/422/500

## 6. Security
- Threats: Unauthorized staff, cross-restaurant/branch, QR guessing, customer to staff endpoints, price manipulation, duplicate orders/billing/waiter, status changes, realtime leakage, secret exposure
- Auth: Staff authenticated, customer secure token/session context
- AuthZ: Every op checks identity→restaurant→branch→role→resource→action
- QR: Unpredictable token, hash stored, regen invalidates old, never sequential ID alone
- Customer: Only own session/order, cannot arbitrary table IDs
- Realtime: Authenticated channels, scoped subscriptions
- Financial: Server recalculates prices/subtotals/taxes/grand/payment/QR amount
- Idempotency: client request ID uniqueness
- DB: Constraints, transactions, indexes, RLS
- Secrets never exposed to browser, Zod validation, audit logs, printing not auth boundary, reconnect resync

## 7. UI/UX
- Style: Professional Glassmorphism + subtle 3D, frosted glass, soft shadows, rounded cards, gradients, strong typography, status colors, minimal clutter
- Customer: Mobile-first, header logo/table/session, menu search/horizontal categories/item cards, cart, order tracking timeline Received→Served realtime, floating bell (Waiter Requested if open)
- Owner Dashboard: Nav Dashboard/Orders/Tables/Menu/Billing/Waiter/Kitchen/Staff/Reports/Settings, cards active/available/new/preparing/ready/waiter/revenue, live feed with sound/visual
- Cashier: Dashboard/Orders/Tables/Billing/Waiter/Kitchen, focus quick billing/printing
- Kitchen: 3-column KDS NEW|PREPARING|READY, large cards, large buttons, table/order prominent, elapsed time, quantities/notes
- Table UI: Cards distinguish Available/Occupied/Bill Pending/Waiter Requested, Owner create/edit/download/regen QR
- Billing UI: Table, orders, subtotal, GST, total, cash/UPI inputs, remaining/validation, QR preview, print, complete, clear QR amount communication
- Responsive: Customer mobile, Owner/Cashier desktop/tablet/mobile, Kitchen desktop/tablet/large display
- Accessibility: Keyboard focus, labels, contrast, semantic buttons, large touch, reduced-motion, sound not only indicator
- Motion: New order arrival, toasts, modals, cart, table status, not excessive in KDS

## 8. User Flows
- Customer QR Ordering: Scan→Validate→Table Context→Browse→Add→Cart→Place→Server Validation→Created→Dashboard/Kitchen Alert→Tracking
- Additional Order: Active Session→Browse→Add→Place Additional→Same Session→New Order Number
- Order Tracking: Received→Confirmed→Preparing→Ready→Served realtime
- Waiter Call: Tap Bell→Confirm→Create→Owner/Cashier Alert+Sound→Acknowledge→Waiter Sent→Resolve
- Owner Table Setup: Login→Tables→Create→Name/Capacity/Section→Save→Generate QR→Download/Print
- Menu Management: Owner→Menu→Category→Create/Edit Item→Price/Availability→Save→Customer Menu Updates
- Kitchen: New→KDS New→Start Preparing→Preparing→Mark Ready→Ready→Served
- Billing: Select Occupied→Load Session→Load Unpaid→Create Bill→GST if enabled→Enter Cash/UPI→Validate→Calculate QR→Print 58mm→Complete→Close Session→Table Available
- Split/Cash-only flows as per UPI rules

## 9. Tech Stack Justification
- Next.js: Unified frontend/backend, Server Actions/API routes, App Router for /t/[token] dynamic
- Supabase: Postgres + Auth + Realtime + Storage in one platform, ideal for V1 modular monolith
- Zod: Shared schemas for API validation + domain boundaries
- QR: qrcode + qrcode.react for Table QR + UPI QR
- Tailwind + Framer Motion: Glassmorphism design system + micro-interactions
- Zustand: Lightweight state for cart/session

## 10. Coding Rules Implementation
- TypeScript strict, no any, explicit domain types, discriminated unions for status machines
- Functional components, focused, presentation vs business logic separated
- Centralized services: OrderService, BillingService, PaymentService, TableService, UPIService, WaiterService
- Server authority: All price/tax/total/payment/QR/table/session calculations server-side
- API: Validate every input, typed errors, consistent status, auth before access
- DB: Migrations concept, FKs, constraints, indexes, no destructive
- Money: numeric + integer paise logic, never float
- UUIDs internal, human-readable order/bill numbers separate
- Realtime: Subscribe only required, unsubscribe on unmount, reconnect, resync, not only persistence
- Idempotency: Every customer order retryable via client_request_id
- Security: No secrets exposed, no trust client role/price/table ID, server+DB auth aligned
- UI: Shared design system (GlassCard, Button, StatCard), responsive, no excessive animation, KDS large/fast
- Error handling: Typed AppError, never silent swallow
- Git: Small focused commits suggestion

## 11. Tasks Mapping (Phase 0-15)
All 15 phases covered in implementation:
0 Setup: Next.js, TS strict, Tailwind, lint, env, .env.example
1 Database: All tables + constraints + indexes + seed
2 Auth/RBAC: Staff login, session, role checks, protected routes
3 Table/QR: CRUD, status model, secure token, regen, download, print, customer resolver
4 Menu: Category/Item CRUD, availability, price, customer rendering, search
5 Customer Ordering: Landing, menu, cart, submission, server price, idempotency, active session, additional
6 Realtime: BroadcastChannel + polling fallback, channels for orders/tables/waiter/kitchen/customer, reconnect/resync
7 Owner/Cashier Dashboard: Shell, live order list, details, status, table overview, waiter notifications, sound
8 KDS: Route /kitchen/display, 3 columns, start prep, ready, realtime, sound, responsive
9 Waiter: Bell UI, create, duplicate prevention, alert, ack/resolve, customer state
10 Billing: Session loader, aggregate unpaid, GST, bill creation, payment allocation, Cash/UPI/Split, validation, completion, session closure, table release
11 UPI QR: Owner settings, validate config, payload generator (upi://pay), amount calculation (split=>UPI else full), full cash, full UPI, split, preview, tests
12 Printing: 58mm bill template, print CSS, kitchen receipt, QR/table print, browser print, failure handling, retry
13 Reports/Settings: Restaurant, UPI, GST, printer, basic reports, audit
14 Testing: Unit for totals/tax/split/QR/status, integration table/session/waiter/billing, E2E customer/staff/KDS/print, security/RLS, realtime
15 Prod Readiness: Error handling, logging, backups concept, migration, performance, mobile, thermal printer, audio, security review

## 12. Critical UPI QR Implementation (Tested Logic)
```ts
function calculateUpiQrAmount(payment:{cash,upi}, grandTotal) {
  if (payment.cash>0 && payment.upi>0) return payment.upi; // split
  return grandTotal; // cash-only or UPI-only or no payments yet
}
// Cash 1500 => QR 1500 (BR-018)
// UPI 1500 => QR 1500 (BR-019)
// Cash 500 + UPI 1000 => QR 1000 (BR-020)
```

## 13. Future Roadmap Ready
- Multi-branch: restaurant_id + branch_id already in all operational tables, default branch seeded
- Split bills, online payments, inventory, loyalty, accounting, multiple kitchens/printers, analytics, floor-plan editor
- Domain boundaries modular for extraction without rewrite

## 14. File Structure Delivered
- app/ (customer, owner, cashier, kitchen, api)
- lib/ (types, utils, db, auth, services, schemas, supabase)
- components/ui (Button, GlassCard, StatCard)
- hooks/useRealtime
- Tailwind + Framer Motion glassmorphism

All BR-001 to BR-030 implemented and tested via manual flows.
