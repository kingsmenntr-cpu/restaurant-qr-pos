-- Restaurant Real-Time QR POS - Supabase Schema V1
create extension if not exists "uuid-ossp";

create table if not exists restaurants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  logo_url text,
  address text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists branches (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  name text not null,
  code text,
  address text,
  phone text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  branch_id uuid references branches(id) on delete cascade,
  role text check (role in ('OWNER','CASHIER','KITCHEN')),
  name text not null,
  email text unique not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists restaurant_settings (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid unique references restaurants(id) on delete cascade,
  timezone text default 'Asia/Kolkata',
  currency text default 'INR',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists payment_settings (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid unique references restaurants(id) on delete cascade,
  upi_enabled boolean default true,
  upi_id text,
  merchant_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists tax_settings (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid unique references restaurants(id) on delete cascade,
  enabled boolean default true,
  cgst_rate numeric default 2.5,
  sgst_rate numeric default 2.5,
  igst_rate numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists tables (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  branch_id uuid references branches(id) on delete cascade,
  name text not null,
  capacity int default 2,
  section text,
  status text check (status in ('AVAILABLE','OCCUPIED','BILL_PENDING','DISABLED')) default 'AVAILABLE',
  is_active boolean default true,
  current_session_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists qr_tokens (
  id uuid primary key default uuid_generate_v4(),
  table_id uuid references tables(id) on delete cascade,
  token text unique not null,
  token_hash text,
  version int default 1,
  is_active boolean default true,
  created_at timestamptz default now(),
  revoked_at timestamptz
);
create table if not exists table_sessions (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  branch_id uuid references branches(id) on delete cascade,
  table_id uuid references tables(id) on delete cascade,
  status text check (status in ('ACTIVE','BILL_PENDING','COMPLETED','CANCELLED')) default 'ACTIVE',
  opened_at timestamptz default now(),
  closed_at timestamptz
);
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  branch_id uuid references branches(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists menu_items (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  branch_id uuid references branches(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  price numeric not null,
  veg_type text check (veg_type in ('VEG','NON_VEG','EGG','VEGAN')) default 'VEG',
  available boolean default true,
  recommended boolean default false,
  bestseller boolean default false,
  preparation_time int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  branch_id uuid references branches(id) on delete cascade,
  table_id uuid references tables(id) on delete cascade,
  table_session_id uuid references table_sessions(id) on delete cascade,
  order_number text unique not null,
  status text check (status in ('NEW','CONFIRMED','PREPARING','READY','SERVED')) default 'NEW',
  subtotal numeric default 0,
  tax_amount numeric default 0,
  total_amount numeric default 0,
  notes text,
  client_request_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  item_name_snapshot text not null,
  unit_price_snapshot numeric not null,
  quantity int check (quantity > 0),
  line_total numeric not null,
  notes text,
  created_at timestamptz default now()
);
create table if not exists waiter_requests (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  branch_id uuid references branches(id) on delete cascade,
  table_id uuid references tables(id) on delete cascade,
  table_session_id uuid references table_sessions(id) on delete cascade,
  status text check (status in ('OPEN','ACKNOWLEDGED','RESOLVED')) default 'OPEN',
  requested_at timestamptz default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);
create table if not exists bills (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  branch_id uuid references branches(id) on delete cascade,
  table_id uuid references tables(id) on delete cascade,
  table_session_id uuid references table_sessions(id) on delete cascade,
  bill_number text unique not null,
  subtotal numeric default 0,
  tax_amount numeric default 0,
  grand_total numeric default 0,
  status text check (status in ('DRAFT','PENDING','PAID','COMPLETED')) default 'PENDING',
  created_at timestamptz default now(),
  completed_at timestamptz
);
create table if not exists bill_orders (
  bill_id uuid references bills(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  primary key (bill_id, order_id)
);
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  bill_id uuid references bills(id) on delete cascade,
  method text check (method in ('CASH','UPI')),
  amount numeric not null,
  status text default 'COMPLETED',
  created_at timestamptz default now()
);
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  branch_id uuid references branches(id) on delete cascade,
  type text not null,
  entity_type text,
  entity_id uuid,
  table_id uuid references tables(id) on delete set null,
  recipient_role text,
  status text default 'UNREAD',
  created_at timestamptz default now()
);
create index if not exists idx_tables_branch_status on tables(branch_id, status);
create index if not exists idx_qr_tokens_token on qr_tokens(token);
create index if not exists idx_table_sessions_table_status on table_sessions(table_id, status);
create index if not exists idx_orders_session_status on orders(table_session_id, status);
create index if not exists idx_orders_branch_created on orders(branch_id, created_at desc);
