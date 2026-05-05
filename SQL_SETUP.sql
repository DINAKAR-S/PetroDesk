-- ============================================================
-- Petro Desk — Supabase SQL Setup (v2)
-- Run ONCE in Supabase SQL Editor (left sidebar → SQL Editor → New query → Paste → Run).
-- This DROPS existing tables and recreates the schema.
-- All bunk-specific data (staff, tanks, nozzles, prices, DUs) is left empty —
-- you add it through the app's Settings UI after first login.
-- The fixed BUNK_ID row in `bunks` is preserved so the hardcoded constant keeps working.
-- ============================================================

-- ── Drop in dependency order ─────────────────────────────────
drop table if exists nozzle_readings    cascade;
drop table if exists shifts             cascade;
drop table if exists tanker_deliveries  cascade;
drop table if exists expenses           cascade;
drop table if exists fuel_prices        cascade;
drop table if exists nozzles            cascade;
drop table if exists dispenser_units    cascade;
drop table if exists tanks              cascade;
drop table if exists staff              cascade;
drop table if exists bunks              cascade;

-- ── Tables ───────────────────────────────────────────────────

create table bunks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  gst_number  text,
  owner_name  text,
  created_at  timestamptz default now()
);

create table staff (
  id              uuid primary key default gen_random_uuid(),
  bunk_id         uuid references bunks(id) on delete cascade,
  name            text not null,
  role            text check (role in ('owner', 'manager', 'salesman')) not null,
  phone           text not null,
  avatar_initials text,
  created_at      timestamptz default now()
);

create table tanks (
  id              uuid primary key default gen_random_uuid(),
  bunk_id         uuid references bunks(id) on delete cascade,
  name            text not null,
  fuel_type       text check (fuel_type in ('MS', 'HSD')) not null,
  capacity_l      numeric not null,
  current_stock_l numeric not null default 0,
  created_at      timestamptz default now()
);

create table fuel_prices (
  id              uuid primary key default gen_random_uuid(),
  bunk_id         uuid references bunks(id) on delete cascade,
  fuel_type       text check (fuel_type in ('MS', 'HSD')) not null,
  price_per_litre numeric not null,
  effective_from  date not null default current_date,
  created_at      timestamptz default now()
);

create table dispenser_units (
  id            uuid primary key default gen_random_uuid(),
  bunk_id       uuid references bunks(id) on delete cascade,
  number        text not null,
  display_name  text,
  created_at    timestamptz default now(),
  unique (bunk_id, number)
);

create table nozzles (
  id                 uuid primary key default gen_random_uuid(),
  bunk_id            uuid references bunks(id) on delete cascade,
  dispenser_unit_id  uuid not null references dispenser_units(id) on delete cascade,
  tank_id            uuid not null references tanks(id),
  slot               smallint check (slot in (1, 2, 3, 4)) not null,
  fuel_type          text check (fuel_type in ('MS', 'HSD')) not null,
  name               text not null,
  created_at         timestamptz default now(),
  unique (dispenser_unit_id, slot)
);

create table shifts (
  id                   uuid primary key default gen_random_uuid(),
  bunk_id              uuid references bunks(id) on delete cascade,
  dispenser_unit_id    uuid not null references dispenser_units(id),
  salesman_id          uuid references staff(id),
  salesman_name        text not null,
  opened_at            timestamptz default now(),
  closed_at            timestamptz,
  status               text check (status in ('open', 'closed', 'flagged')) default 'open',
  total_litres_sold    numeric default 0,
  total_revenue        numeric default 0,
  total_cash_collected numeric default 0,
  expected_cash        numeric default 0,
  cash_variance        numeric default 0,
  ms_litres            numeric default 0,
  hsd_litres           numeric default 0,
  ms_revenue           numeric default 0,
  hsd_revenue          numeric default 0,
  notes                text,
  created_at           timestamptz default now()
);

-- Enforce: at most one open shift per DU.
create unique index uniq_one_open_shift_per_du
  on shifts (dispenser_unit_id)
  where status = 'open';

create table nozzle_readings (
  id                  uuid primary key default gen_random_uuid(),
  shift_id            uuid references shifts(id) on delete cascade,
  nozzle_id           uuid references nozzles(id),
  nozzle_name         text not null,
  fuel_type           text not null,
  slot                smallint not null,
  opening_cum_volume  numeric not null,
  opening_cum_sale    numeric not null,
  closing_cum_volume  numeric,
  closing_cum_sale    numeric,
  litres_sold         numeric default 0,
  rupees_sold         numeric default 0,
  created_at          timestamptz default now()
);

create table tanker_deliveries (
  id              uuid primary key default gen_random_uuid(),
  bunk_id         uuid references bunks(id) on delete cascade,
  tank_id         uuid references tanks(id),
  tank_name       text not null,
  fuel_type       text not null,
  quantity_l      numeric not null,
  rate_per_litre  numeric,
  total_amount    numeric,
  supplier_name   text,
  invoice_number  text,
  delivery_date   date default current_date,
  created_at      timestamptz default now()
);

create table expenses (
  id           uuid primary key default gen_random_uuid(),
  bunk_id      uuid references bunks(id) on delete cascade,
  description  text not null,
  amount       numeric not null,
  category     text default 'general',
  expense_date date default current_date,
  created_at   timestamptz default now()
);

-- ── Disable RLS (prototype — re-enable when real auth is added) ──

alter table bunks              disable row level security;
alter table staff              disable row level security;
alter table tanks              disable row level security;
alter table fuel_prices        disable row level security;
alter table dispenser_units    disable row level security;
alter table nozzles            disable row level security;
alter table shifts             disable row level security;
alter table nozzle_readings    disable row level security;
alter table tanker_deliveries  disable row level security;
alter table expenses           disable row level security;

-- ── Seed: only the bunk row (preserves hardcoded BUNK_ID) ────

insert into bunks (id, name)
values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'My Petrol Bunk');

-- ── Done ─────────────────────────────────────────────────────
-- Schema ready. Open the app, log in (any phone), pick role Owner on first login,
-- then go to Settings to add fuel prices, tanks, dispenser units, nozzles, and staff.
