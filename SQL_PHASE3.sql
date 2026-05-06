-- ============================================================
-- Petro Desk — Phase 3 additive migration
-- (1) Add per-nozzle initial CumVolume / CumSale columns so an existing
--     bunk with already-running meters can seed the FIRST shift's openings
--     (instead of starting at zero, which made the entire historical
--     accumulation count as one shift).
-- (2) Wipe the trial-run shift data (3 shifts + their child rows) so the
--     bunk can start fresh once the initial values are configured.
--
-- Run AFTER SQL_SETUP.sql + SQL_PHASE2.sql, in Supabase SQL Editor.
--
-- ⚠️  Run this file ONCE. The column additions are idempotent
-- (IF NOT EXISTS) but the DELETE statements below are NOT — running this
-- file again after real shifts have been recorded WILL wipe shift history.
-- Catalogs, staff, tanks, DUs, nozzles, and customers are preserved.
-- ============================================================

-- ── (1) Schema additions ────────────────────────────────────

alter table nozzles add column if not exists initial_cum_volume numeric not null default 0;
alter table nozzles add column if not exists initial_cum_sale   numeric not null default 0;

-- ── (2) Wipe trial-run shifts + children ────────────────────
-- Order matters: ledger first, then per-shift entries, then readings, then shifts.
-- Customers / staff / tanks / DUs / nozzles / catalogs are KEPT.

delete from customer_ledger          where shift_id is not null;
delete from shift_other_sales        where shift_id is not null;
delete from shift_electronic_entries where shift_id is not null;
delete from shift_expense_entries    where shift_id is not null;
delete from shift_credit_entries     where shift_id is not null;
delete from nozzle_readings;
delete from shifts;

-- Tanker deliveries + standalone expenses kept (they're not shift-tied).

-- Reset tank current_stock_l to 0 so it reflects "unknown / set during the
-- next tanker delivery". Comment out this line if you'd rather keep the
-- previous value.
update tanks set current_stock_l = 0;

-- ── Done ────────────────────────────────────────────────────
-- Next: in the app, log in as Owner, go to Settings → Nozzles, edit each
-- of the 8 nozzles and fill the new "Initial CumVolume" + "Initial CumSale"
-- fields with the values from the most recent printer slip for that nozzle.
-- After that, opening a new shift on either DU will pre-fill the openings
-- with those values, and litres_sold / revenue will be correct.
