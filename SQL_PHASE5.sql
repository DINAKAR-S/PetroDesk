-- ============================================================
-- Petro Desk — Phase 5 additive migration
-- (1) bank_deposits — manager records what was actually deposited at the
--     bank each day. Difference between expected (= sum of closed shifts'
--     cash_in_hand for that date) and deposited is petty cash.
-- (2) customer_ledger.photo_url — Khaata can attach photos for "You Got"
--     settlement receipts (or "You Gave" if owner hands credit slip).
--
-- Run AFTER SQL_SETUP.sql + SQL_PHASE2.sql + SQL_PHASE3.sql + SQL_PHASE4.sql.
-- Idempotent — safe to re-run.
-- ============================================================

-- ── (1) bank_deposits ───────────────────────────────────────

create table if not exists bank_deposits (
  id                       uuid primary key default gen_random_uuid(),
  bunk_id                  uuid references bunks(id) on delete cascade,
  deposit_date             date not null,
  expected_amount          numeric not null default 0,
  deposited_amount         numeric not null default 0,
  petty_cash               numeric not null default 0,
  deposited_by_user_id     uuid references staff(id),
  notes                    text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now(),
  unique (bunk_id, deposit_date)
);

alter table bank_deposits disable row level security;

-- ── (2) customer_ledger.photo_url ───────────────────────────

alter table customer_ledger
  add column if not exists photo_url text;

-- ── Storage bucket for Khaata photos ─────────────────────────
-- Create a PUBLIC bucket named 'customer-photos' so the frontend can
-- read uploaded photos by URL without auth headers. Run this only ONCE
-- (will error harmlessly if the bucket already exists).
insert into storage.buckets (id, name, public)
values ('customer-photos', 'customer-photos', true)
on conflict (id) do nothing;

-- Allow anyone with the publishable key to upload + read while RLS is
-- still off across the project. Tighten when real auth is added.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'customer-photos public read') then
    create policy "customer-photos public read" on storage.objects
      for select to public using (bucket_id = 'customer-photos');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'customer-photos anon insert') then
    create policy "customer-photos anon insert" on storage.objects
      for insert to public with check (bucket_id = 'customer-photos');
  end if;
end$$;

-- ── Done ────────────────────────────────────────────────────
