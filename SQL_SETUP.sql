-- ============================================================
-- PetroDisk — Supabase SQL Setup Script
-- Run this ONCE in Supabase SQL Editor (left sidebar → SQL Editor → New query → Paste → Run)
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

create table if not exists bunks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  gst_number text,
  owner_name text,
  created_at timestamptz default now()
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  bunk_id uuid references bunks(id) on delete cascade,
  name text not null,
  role text check (role in ('owner', 'manager', 'salesman')) not null,
  phone text not null,
  avatar_initials text,
  created_at timestamptz default now()
);

create table if not exists tanks (
  id uuid primary key default gen_random_uuid(),
  bunk_id uuid references bunks(id) on delete cascade,
  name text not null,
  fuel_type text check (fuel_type in ('MS', 'HSD', 'XP')) not null,
  capacity_l numeric not null,
  current_stock_l numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists nozzles (
  id uuid primary key default gen_random_uuid(),
  bunk_id uuid references bunks(id) on delete cascade,
  tank_id uuid references tanks(id) on delete set null,
  name text not null,
  fuel_type text check (fuel_type in ('MS', 'HSD', 'XP')) not null,
  current_meter_reading numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists fuel_prices (
  id uuid primary key default gen_random_uuid(),
  bunk_id uuid references bunks(id) on delete cascade,
  fuel_type text check (fuel_type in ('MS', 'HSD', 'XP')) not null,
  price_per_litre numeric not null,
  effective_from date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  bunk_id uuid references bunks(id) on delete cascade,
  salesman_id uuid references staff(id),
  salesman_name text not null,
  opened_at timestamptz default now(),
  closed_at timestamptz,
  status text check (status in ('open', 'closed', 'flagged')) default 'open',
  total_litres_sold numeric default 0,
  total_cash_collected numeric default 0,
  expected_cash numeric default 0,
  cash_variance numeric default 0,
  dip_variance_pct numeric default 0,
  ms_litres numeric default 0,
  hsd_litres numeric default 0,
  xp_litres numeric default 0,
  ms_revenue numeric default 0,
  hsd_revenue numeric default 0,
  xp_revenue numeric default 0,
  notes text,
  created_at timestamptz default now()
);

create table if not exists nozzle_readings (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid references shifts(id) on delete cascade,
  nozzle_id uuid references nozzles(id),
  nozzle_name text not null,
  fuel_type text not null,
  opening_reading numeric not null,
  closing_reading numeric,
  litres_sold numeric default 0,
  created_at timestamptz default now()
);

create table if not exists tanker_deliveries (
  id uuid primary key default gen_random_uuid(),
  bunk_id uuid references bunks(id) on delete cascade,
  tank_id uuid references tanks(id),
  tank_name text not null,
  fuel_type text not null,
  quantity_l numeric not null,
  rate_per_litre numeric,
  total_amount numeric,
  supplier_name text,
  invoice_number text,
  delivery_date date default current_date,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  bunk_id uuid references bunks(id) on delete cascade,
  description text not null,
  amount numeric not null,
  category text default 'general',
  expense_date date default current_date,
  created_at timestamptz default now()
);

-- ── Disable RLS (prototype — re-enable when real auth is added) ──

alter table bunks disable row level security;
alter table staff disable row level security;
alter table tanks disable row level security;
alter table nozzles disable row level security;
alter table fuel_prices disable row level security;
alter table shifts disable row level security;
alter table nozzle_readings disable row level security;
alter table tanker_deliveries disable row level security;
alter table expenses disable row level security;

-- ── Seed Data ────────────────────────────────────────────────

-- Bunk
insert into bunks (id, name, address, gst_number, owner_name)
values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rajan Petroleum', '12 Anna Salai, Chennai – 600002', '33AABCU9603R1ZX', 'Rajan')
on conflict (id) do nothing;

-- Staff
insert into staff (id, bunk_id, name, role, phone, avatar_initials) values
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rajan',   'owner',    '9999999999', 'RJ'),
  ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kumar',   'manager',  '8888888888', 'KM'),
  ('b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Murugan', 'salesman', '7777777777', 'MG')
on conflict (id) do nothing;

-- Tanks
insert into tanks (id, bunk_id, name, fuel_type, capacity_l, current_stock_l) values
  ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tank 1', 'MS',  10000, 6500),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tank 2', 'HSD', 15000, 4200)
on conflict (id) do nothing;

-- Nozzles
insert into nozzles (bunk_id, tank_id, name, fuel_type, current_meter_reading) values
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nozzle 1', 'MS',  45230),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nozzle 2', 'MS',  32100),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nozzle 3', 'HSD', 28450);

-- Fuel prices (Tamil Nadu approximate rates)
insert into fuel_prices (bunk_id, fuel_type, price_per_litre) values
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MS',  102.72),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'HSD',  89.62),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'XP',  110.50);

-- Sample shifts (last 7 days)
insert into shifts (bunk_id, salesman_id, salesman_name, opened_at, closed_at, status,
  total_litres_sold, total_cash_collected, expected_cash, cash_variance, dip_variance_pct,
  ms_litres, hsd_litres, ms_revenue, hsd_revenue) values
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Murugan',
    now() - interval '6 days' + interval '6 hours', now() - interval '6 days' + interval '14 hours',
    'closed', 892,  91444, 91444,     0,  0.2, 600, 292,  61632, 26163),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Murugan',
    now() - interval '5 days' + interval '6 hours', now() - interval '5 days' + interval '14 hours',
    'closed', 1050, 107656, 107856, -200,  0.8, 700, 350, 71904, 31367),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Murugan',
    now() - interval '4 days' + interval '6 hours', now() - interval '4 days' + interval '14 hours',
    'closed', 980, 100506, 100506,    0,  0.1, 650, 330, 66768, 29575),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Murugan',
    now() - interval '3 days' + interval '6 hours', now() - interval '3 days' + interval '14 hours',
    'closed', 1120, 114946, 114646, 300,  1.2, 720, 400, 73958, 35848),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Murugan',
    now() - interval '2 days' + interval '6 hours', now() - interval '2 days' + interval '14 hours',
    'closed', 750, 77040,  77040,    0,  0.3, 500, 250, 51360, 22405),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Murugan',
    now() - interval '1 day' + interval '6 hours', now() - interval '1 day' + interval '14 hours',
    'closed', 1200, 123164, 123264, -100, 0.4, 800, 400, 82176, 35848),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Murugan',
    now() - interval '5 hours', null,
    'open', 0, 0, 0, 0, 0, 0, 0, 0, 0);

-- Sample tanker deliveries
insert into tanker_deliveries (bunk_id, tank_id, tank_name, fuel_type, quantity_l, rate_per_litre, total_amount, supplier_name, invoice_number, delivery_date) values
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tank 1', 'MS',  5000, 89.50, 447500, 'BPCL Chennai Depot', 'INV-2024-1234', current_date - 3),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tank 2', 'HSD', 8000, 78.20, 625600, 'HPCL Chennai',       'INV-2024-1235', current_date - 1);

-- Sample expenses
insert into expenses (bunk_id, description, amount, category, expense_date) values
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Electricity bill',      8500,  'utilities',   current_date - 5),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Staff salary – Murugan', 15000, 'salary',      current_date - 3),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nozzle maintenance',    2200,  'maintenance', current_date - 1),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Cleaning supplies',     800,   'general',     current_date);

-- ── Done ────────────────────────────────────────────────────
-- All tables created, RLS disabled, seed data inserted.
