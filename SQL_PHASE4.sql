-- ============================================================
-- Petro Desk — Phase 4 additive migration
-- (1) Adds an 'other_sales_categories' table — owner organises catalog into
--     categories (Fuel Additive Sales, Distilled Water, Lube Sales, ...).
-- (2) other_sales_items gains category_id.
-- (3) shift_other_sales gains unit_price + discount + denormalised
--     category_id/category_name (for history when categories rename/delete).
-- (4) Wipes existing other_sales_items (only 3 prototype rows) and seeds the
--     full catalog the user described: 3 categories with 25 products total.
--
-- Run AFTER SQL_SETUP.sql + SQL_PHASE2.sql + SQL_PHASE3.sql.
-- Schema additions are idempotent. The seed wipes and recreates the catalog
-- but keeps shift_other_sales rows (FK on items is ON DELETE SET NULL by
-- default, which is fine — historical entries keep their denormalised
-- item_name and the new category_name fields).
-- ============================================================

-- ── (1) Categories table ────────────────────────────────────

create table if not exists other_sales_categories (
  id          uuid primary key default gen_random_uuid(),
  bunk_id     uuid references bunks(id) on delete cascade,
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

alter table other_sales_categories disable row level security;

-- ── (2) other_sales_items: add category_id ──────────────────

alter table other_sales_items
  add column if not exists category_id uuid references other_sales_categories(id);

-- ── (3) shift_other_sales: add unit_price + discount + denorm category ──

alter table shift_other_sales add column if not exists unit_price    numeric not null default 0;
alter table shift_other_sales add column if not exists discount      numeric not null default 0;
alter table shift_other_sales add column if not exists category_id   uuid;
alter table shift_other_sales add column if not exists category_name text;

-- ── (4) Wipe existing prototype items + reseed full catalog ─

delete from other_sales_items where bunk_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
delete from other_sales_categories where bunk_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Categories
with cat_seed as (
  insert into other_sales_categories (bunk_id, name) values
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fuel Additive Sales'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Distilled Water'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Lube Sales')
  returning id, name
)
-- Products (joined to their category by name)
insert into other_sales_items (bunk_id, category_id, name, price_per_litre, active)
select 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', c.id, p.name, p.price, true
from cat_seed c
join (values
  -- Fuel Additive Sales
  ('Fuel Additive Sales', '5 ml',     15),
  ('Fuel Additive Sales', '10 ml',    30),
  ('Fuel Additive Sales', '40 ml',   200),
  ('Fuel Additive Sales', '50 ml',   200),
  -- Distilled Water
  ('Distilled Water',     '1 L',      20),
  ('Distilled Water',     '2 L',      40),
  ('Distilled Water',     '5 L',     100),
  -- Lube Sales (deduped, 18 items)
  ('Lube Sales',          '20 ml',                            10),
  ('Lube Sales',          '40 ml',                            20),
  ('Lube Sales',          '60 ml',                            25),
  ('Lube Sales',          '1 Ltr (2T)',                      330),
  ('Lube Sales',          '(20-50) 1 Ltr',                   420),
  ('Lube Sales',          '1 Ltr (4T)',                      380),
  ('Lube Sales',          '1 Ltr (Cool)',                    300),
  ('Lube Sales',          '1 Ltr (15-40)',                   340),
  ('Lube Sales',          '1/2 Ltr (2T)',                    170),
  ('Lube Sales',          '20/50 half ltr',                  215),
  ('Lube Sales',          '1/4 Ltr Brake Fluid',             113),
  ('Lube Sales',          'Gear oil 1 Ltr',                  360),
  ('Lube Sales',          '4T 1ltr (HP Racer)',              400),
  ('Lube Sales',          '2T half ltr',                     170),
  ('Lube Sales',          '(15-40) 1 Ltr Engine Oil',        265),
  ('Lube Sales',          'Petrol Engine Oil (3.5 Ltrs)',   1735),
  ('Lube Sales',          'Ad Blue (5 Ltr)',                 500),
  ('Lube Sales',          'Grease (1/2 kg)',                 260),
  ('Lube Sales',          'Grease 200 gm',                   123)
) as p(category_name, name, price) on p.category_name = c.name;

-- ── Done ────────────────────────────────────────────────────
-- After this, refresh the app. Settings → Other Sales will show 3 categories
-- with their products. Manager can add more categories / items / change
-- prices any time. Salesman picks a category + product + quantity (+ optional
-- flat ₹ discount) per Other-Sales line in the close-shift form.
