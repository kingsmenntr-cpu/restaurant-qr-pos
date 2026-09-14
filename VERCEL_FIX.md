# 🔴 Vercel Par Orders Nahi Dikh Rahe? - FIX GUIDE

## Problem Samjho
Aapne screenshot me dikhaya:
- Customer ne order kiya: `ORD-584911-252` - Table T-01 par ✅ dikh raha hai
- Par Owner Dashboard: `Active Tables 0`, `New Orders 0`, `No recent orders` ❌
- Cashier aur Kitchen bhi khali ❌

**Root Cause:** 
Vercel serverless functions me **in-memory DB share nahi hota**. Har API call alag server par jata hai:
- Customer order → Ek server ke memory me save hua
- Owner dashboard → Dusre server se data manga, wahan memory khali thi, isliye 0 dikha

Local me `npm run dev` par sab ek hi process me hai, isliye kaam karta hai. Vercel par fail hota hai.

## ✅ Solution: Supabase Lagao (5 Minute Me)

### Step 1: Supabase Project Banao (Free)
1. https://supabase.com → Sign up → New Project
2. Name: `restaurant-qr-pos` → Password set karo → Create
3. 2 min wait karo project ready hone tak

### Step 2: Database Tables Banao
1. Supabase Dashboard → Left me **SQL Editor** → **New Query**
2. `supabase/schema.sql` file ka pura content copy-paste karo (project me hai)
3. **Run** click karo - saare tables ban jayenge

### Step 3: Seed Data (Tables, Menu)
Supabase → SQL Editor → New Query → Ye chalao:

```sql
-- Restaurant
insert into restaurants (id, name, slug, address, phone) values 
('11111111-1111-1111-1111-111111111111', 'Agra Foods - Royal Taste', 'agra-foods', 'Near Taj Mahal, Agra, UP', '+91 98765 43210');

-- Branch
insert into branches (id, restaurant_id, name, code, is_active) values
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Main Branch', 'MAIN', true);

-- Users
insert into users (id, restaurant_id, branch_id, role, name, email, is_active) values
('u-owner-1', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'OWNER', 'Owner', 'owner@restaurant.com', true),
('u-cashier-1', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'CASHIER', 'Cashier', 'cashier@restaurant.com', true),
('u-kitchen-1', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'KITCHEN', 'Kitchen', 'kitchen@restaurant.com', true);

-- Settings
insert into restaurant_settings (restaurant_id, timezone, currency) values ('11111111-1111-1111-1111-111111111111', 'Asia/Kolkata', 'INR');
insert into payment_settings (restaurant_id, upi_enabled, upi_id, merchant_name) values ('11111111-1111-1111-1111-111111111111', true, 'agrafoods@upi', 'Agra Foods');
insert into tax_settings (restaurant_id, enabled, cgst_rate, sgst_rate, igst_rate) values ('11111111-1111-1111-1111-111111111111', true, 2.5, 2.5, 0);

-- Categories (run and note IDs, then use for menu_items)
insert into categories (restaurant_id, branch_id, name, sort_order, is_active) values
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Starters', 1, true),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Main Course', 2, true),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Breads', 3, true),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Beverages', 4, true),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Desserts', 5, true);
```

Phir categories ke IDs nikal ke menu items aur tables insert karna hoga. Easy way: **Seed API** use karo jo maine banaya hai:

### Step 4: Supabase Keys Nikalo
Supabase → Settings → API → 
- `Project URL` copy karo
- `anon public` key copy karo
- `service_role` key copy karo (secret, safe rakho)

### Step 5: Vercel Me Env Variables Lagao (MOST IMPORTANT)
1. Vercel Dashboard → Aapka project `restaurant-qr-pos` → **Settings** → **Environment Variables**
2. Ye 3 variables add karo:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service_role wala)
```

3. **Save** → **Deployments** → Last deployment ke 3 dots → **Redeploy** → Redeploy

### Step 6: Test Karo
1. Customer QR se order karo
2. Owner dashboard refresh karo - ab orders dikhne chahiye!
3. Kitchen, Cashier bhi dikhega

## 🔄 Alternative: Quick Seed API (Bina SQL Ke)

Maine ek seed API banaya hai jo Supabase me pura data daal dega:

```bash
# Local me .env.local me Supabase keys daal ke
curl -X POST https://your-vercel-app.vercel.app/api/seed-supabase
```

Ya browser me: `https://your-app.vercel.app/api/seed-supabase` (POST request)

## 🛠️ Code Me Kya Fix Kiya Hai

1. `lib/db.ts` → Ab Supabase check karta hai, agar enabled hai to Supabase se data leta hai
2. `lib/services/orderService.ts` → Supabase first, in-memory fallback
3. `app/api/orders/route.ts`, `dashboard/stats`, `kitchen/orders`, `customer` → Sab Supabase compatible
4. `supabase/schema.sql` → Full schema with indexes + realtime enabled
5. `lib/supabase/server.ts` → Service role + anon clients

## 📱 Local Me Bhi Supabase Test Karna Hai?

```bash
# .env.local me add karo
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

npm run dev
```

Ab local bhi Supabase use karega, Vercel jaisa behavior.

## ❓ Abhi Bhi Nahi Chal Raha?

1. Vercel logs check karo: Vercel Dashboard → Deployments → Latest → Logs
2. Supabase tables me data hai ki nahi check karo: Table Editor → orders table
3. Env variables sahi hai ki nahi check karo - URL me trailing slash mat lagao

Mujhe Vercel logs ka screenshot bhejo, main debug kar dunga!
