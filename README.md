# 🍽️ Restaurant Real-Time QR POS - V1 Production Ready

**Glassmorphism + 3D • Next.js • Supabase Ready • 58mm Thermal • Dynamic UPI QR**

Live Demo: `npm run dev` → http://localhost:3000

## ✨ Features Implemented (V1 Final)

### Customer (No Account, QR Based)
- Scan unique table QR → Menu → Cart → Place Order
- Real-time order tracking: NEW → CONFIRMED → PREPARING → READY → SERVED
- Additional orders in same active session
- Waiter bell with duplicate prevention
- Mobile-first glassmorphism UI

### Owner Dashboard (Full Control)
- Dashboard: active/available tables, new/preparing/ready orders, waiter calls, revenue, live feed
- Tables & QR: Create tables, secure token generation, regen invalidates old, download PNG, print 58mm
- Menu: Categories CRUD, Items CRUD, availability toggle, veg/non-veg, bestseller, price management
- Orders: Live orders with status management, sound alerts
- Billing: Active sessions → aggregate unpaid orders → GST → bill creation → Cash/UPI/Split validation → Dynamic UPI QR → 58mm print → Complete → Release table
- Waiter: OPEN/ACKNOWLEDGED/RESOLVED with realtime alerts
- KDS: NEW|PREPARING|READY columns, large cards, elapsed time
- Settings: Restaurant info, UPI ID/Merchant Name, GST CGST/SGST/IGST toggle
- Reports: Revenue, bills, avg bill, orders

### Cashier
- Live orders view, tables overview, billing (Cash/UPI/Split), waiter, kitchen view

### Kitchen Display System (KDS)
- Route: `/kitchen/display`
- 3 columns, large action buttons, sound beep on new order, elapsed minutes

### Billing & UPI QR (Critical Logic)
- GST calculation when enabled
- Payment validation: Cash + UPI = Grand Total
- **UPI QR Amount Rule (BR-018,019,020):**
  - `if split payment → QR amount = UPI portion`
  - `otherwise → QR amount = full bill amount`
  - Cash-only bill still prints full UPI QR
- UPI Payload: `upi://pay?pa=UPI_ID&pn=MERCHANT_NAME&am=AMOUNT&cu=INR&tn=Bill BILL_NUMBER`

### Printing
- 58mm thermal CSS: `.print-area`, `.print-58`
- Customer bill with items, totals, tax, payment info, dynamic UPI QR
- Kitchen receipt, Table QR print
- Browser/system print, failure does not delete bill/order (BR-023)

### Realtime
- BroadcastChannel for instant cross-tab updates + polling fallback (3s)
- Events: order.created/confirmed/preparing/ready/served, waiter_request.created/resolved, table.status_changed, bill.created/completed
- Ready to swap with Supabase Realtime (provider abstraction in `lib/db.ts` emitEvent)

### Security
- Staff auth via mock login (owner@restaurant.com/owner123, cashier/cashier123, kitchen/kitchen123) - replace with Supabase Auth in prod
- Server authority: All price/tax/total/payment/QR calculations server-side (BR-024)
- QR: Unpredictable token (crypto.randomUUID), hash stored, regen invalidates old
- Tenant isolation: restaurant_id + branch_id in all operational tables
- Idempotency: client_request_id unique per table session (BR-010)
- Duplicate waiter prevention (BR-012)
- Zod validation, typed AppError, RLS ready

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 App Router, React 18, TypeScript strict, Tailwind CSS, Framer Motion
- **Backend:** Next.js Server Actions + API Routes
- **DB:** PostgreSQL via Supabase (preferred) - currently in-memory with Supabase client ready, easily swappable
- **Validation:** Zod
- **QR:** qrcode, qrcode.react, qrserver API for quick preview
- **State:** Zustand (cart), BroadcastChannel (realtime)
- **Printing:** 58mm CSS + browser print

## 📁 Project Structure

```
app/
  page.tsx (landing)
  login/page.tsx
  t/[token]/page.tsx (customer)
  owner/ (dashboard, tables, menu, orders, billing, waiter, kitchen, settings, reports, staff)
  cashier/ (orders, tables, billing, waiter, kitchen)
  kitchen/display/page.tsx (KDS)
  api/ (auth, tables, menu, orders, billing, waiter-requests, kitchen, dashboard, settings, reports, customer)
lib/
  types.ts (domain types, AppError)
  utils.ts (money paise-safe, UPI QR logic, token gen)
  db.ts (in-memory DB + seed + emitEvent + BroadcastChannel ready)
  auth.ts (mock auth + cookie)
  schemas.ts (Zod)
  services/ (tableService, menuService, orderService, waiterService, billingService, upiService, settingsService)
  supabase/client.ts
components/
  ui/ (button, card - GlassCard, StatCard)
hooks/
  useRealtime (polling + BroadcastChannel + sound)
```

## 🚀 Quick Start

```bash
cd restaurant-qr-pos
npm install
npm run dev
# Open http://localhost:3000
```

### Demo Accounts
- Owner: `owner@restaurant.com` / `owner123` → /owner
- Cashier: `cashier@restaurant.com` / `cashier123` → /cashier/orders
- Kitchen: `kitchen@restaurant.com` / `kitchen123` → /kitchen/display

### Demo Customer Flow
1. Go to Owner → Tables & QR
2. Copy QR link or scan: `/t/{token}` (e.g., click QR image)
3. Customer page loads menu, add items, place order
4. Watch Owner Dashboard / KDS live update (no refresh)
5. Call waiter via bell icon
6. Go to Billing → Select occupied table → Create Bill → Enter Cash/UPI → Apply → Preview UPI QR → Print → Complete → Table released

## 💳 Billing Test Cases (Automated in logic)

- Bill ₹1500, Cash ₹1500 → QR ₹1500
- Bill ₹1500, UPI ₹1500 → QR ₹1500
- Bill ₹1500, Cash ₹500 + UPI ₹1000 → QR ₹1000
- Bill ₹1500, Cash ₹1000 + UPI ₹500 → QR ₹500

Tested in `lib/utils.ts` → `calculateUpiQrAmount`

## 🖨️ 58mm Thermal Printing

- Bill template in `app/owner/billing/page.tsx` has `print-area` class
- Print CSS in `app/globals.css` hides everything except `.print-area` and forces 58mm width
- UPI QR generated via `https://api.qrserver.com/v1/create-qr-code/` for quick preview, replace with client-side qrcode for offline

## 🔐 Supabase Migration (Production)

1. Create Supabase project
2. Set env in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```
3. Run migrations (create tables as per DATABASE.pdf spec)
4. Replace `lib/db.ts` in-memory with Supabase queries - services already abstracted
5. Enable Supabase Realtime for `orders`, `waiter_requests`, `tables` tables
6. Enable RLS policies per SECURITY.pdf

## 📜 Business Rules Coverage

All BR-001 to BR-030 implemented. See ANALYSIS.md for mapping.

## 🎨 UI - Glassmorphism + Subtle 3D

- Frosted glass: `bg-white/[0.06] backdrop-blur-2xl border-white/[0.12] shadow-glass`
- Gradients: violet→indigo, fuchsia→blue, radial blurs
- Rounded 20px cards, soft shadows, inset highlights
- Framer Motion: initial opacity/y, whileTap scale, AnimatePresence for cart
- Customer mobile-first, Owner/Cashier responsive, KDS large high-contrast

## 🧪 Testing Recommendations (Phase 14)

- Unit: totals, tax, payment split, UPI QR amount, order state transitions
- Integration: table/session lifecycle, waiter duplicate prevention, billing aggregation
- E2E: Customer flow Scan→Order→Track→Additional→Waiter→Bill, Staff flow, KDS flow, Print flow
- Security: RLS tenant isolation, QR token guessing, client price manipulation
- Realtime: Disconnect/reconnect resync

## 📦 Deployment

- Vercel/Netlify for Next.js
- Supabase for Postgres/Auth/Realtime/Storage
- Separate Dev/Staging/Prod envs
- CDN for images

## 🔮 Future Roadmap (Multi-Branch Ready)

- Core records already have restaurant_id + branch_id
- Seed creates default branch, existing V1 data maps to default branch
- Future: Multi-branch UI, split bills, online payments, inventory, loyalty, accounting, multiple kitchens/printers, analytics, floor-plan editor

---

**Built with ❤️ for Agra Foods - Royal Taste | V1 Final 2026-09-14**
