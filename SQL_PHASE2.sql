-- ============================================================
-- Petro Desk — Phase 2 additive migration
-- Run this AFTER SQL_SETUP.sql (Phase 1) once you've already configured
-- bunk profile, fuel prices, tanks, dispenser units, nozzles, and staff.
--
-- This script is purely additive — it does NOT drop or modify existing data.
-- Safe to re-run.
-- ============================================================

-- ── Catalog tables (configured by owner in Settings) ─────────

create table if not exists other_sales_items (
  id                uuid primary key default gen_random_uuid(),
  bunk_id           uuid references bunks(id) on delete cascade,
  name              text not null,
  price_per_litre   numeric not null,
  quantity_options  jsonb not null default '[1, 2, 3, 5]'::jsonb,
  active            boolean not null default true,
  created_at        timestamptz default now()
);

create table if not exists electronic_methods (
  id          uuid primary key default gen_random_uuid(),
  bunk_id     uuid references bunks(id) on delete cascade,
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

create table if not exists expense_categories (
  id          uuid primary key default gen_random_uuid(),
  bunk_id     uuid references bunks(id) on delete cascade,
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

-- Customers — minimal in Phase 2; full Khaata UI is Phase 3a.
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  bunk_id     uuid references bunks(id) on delete cascade,
  name        text not null,
  phone       text,
  notes       text,
  created_at  timestamptz default now()
);

-- ── Per-shift entry tables ──────────────────────────────────

create table if not exists shift_other_sales (
  id           uuid primary key default gen_random_uuid(),
  shift_id     uuid references shifts(id) on delete cascade,
  item_id      uuid references other_sales_items(id),
  item_name    text not null,
  quantity     numeric not null,
  amount       numeric not null,
  created_at   timestamptz default now()
);

create table if not exists shift_electronic_entries (
  id                       uuid primary key default gen_random_uuid(),
  shift_id                 uuid references shifts(id) on delete cascade,
  method_id                uuid references electronic_methods(id),
  method_name              text not null,
  amount                   numeric not null,
  bank_confirmed           boolean default false,
  bank_confirmed_at        timestamptz,
  bank_confirmed_by_user_id uuid references staff(id),
  created_at               timestamptz default now()
);

create table if not exists shift_expense_entries (
  id            uuid primary key default gen_random_uuid(),
  shift_id      uuid references shifts(id) on delete cascade,
  category_id   uuid references expense_categories(id),
  category_name text not null,
  amount        numeric not null,
  description   text,
  created_at    timestamptz default now()
);

create table if not exists shift_credit_entries (
  id            uuid primary key default gen_random_uuid(),
  shift_id      uuid references shifts(id) on delete cascade,
  customer_id   uuid references customers(id),
  customer_name text not null,
  amount        numeric not null,
  created_at    timestamptz default now()
);

-- Customer ledger feeds Phase 3a Khaata UI. shift_id is null for off-shift settlements.
create table if not exists customer_ledger (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references customers(id) on delete cascade,
  shift_id     uuid references shifts(id) on delete set null,
  entry_type   text check (entry_type in ('credit_taken', 'settlement')) not null,
  amount       numeric not null,
  notes        text,
  created_at   timestamptz default now()
);

-- ── Shift aggregate columns (per close-form section totals) ──

alter table shifts add column if not exists testing_ms_volume     numeric default 0;
alter table shifts add column if not exists testing_ms_sale       numeric default 0;
alter table shifts add column if not exists testing_hsd_volume    numeric default 0;
alter table shifts add column if not exists testing_hsd_sale      numeric default 0;
alter table shifts add column if not exists total_other_sales     numeric default 0;
alter table shifts add column if not exists total_electronic      numeric default 0;
alter table shifts add column if not exists total_credit          numeric default 0;
alter table shifts add column if not exists total_expenses        numeric default 0;
alter table shifts add column if not exists cash_in_hand          numeric default 0;
alter table shifts add column if not exists handover_to_next      numeric default 0;
alter table shifts add column if not exists deposit_to_owner      numeric default 0;

-- ── Disable RLS on the new tables ───────────────────────────

alter table other_sales_items        disable row level security;
alter table electronic_methods       disable row level security;
alter table expense_categories       disable row level security;
alter table customers                disable row level security;
alter table shift_other_sales        disable row level security;
alter table shift_electronic_entries disable row level security;
alter table shift_expense_entries    disable row level security;
alter table shift_credit_entries     disable row level security;
alter table customer_ledger          disable row level security;

-- ── Done. ────────────────────────────────────────────────────
-- After running this, refresh the app and configure the catalogs in Settings:
-- Other Sales (e.g. Distilled Water ₹200/L, Oil ₹100/L, AdBlue ₹175/L)
-- Electronic Methods (UPI, Credit Card, ...)
-- Expense Categories (Tea/Coffee, Maintenance, ...)
