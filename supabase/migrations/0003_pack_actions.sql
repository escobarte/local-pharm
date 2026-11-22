-- =====================================================================
-- Local Pharm — 0003_pack_actions
-- Phase 3: atomic "took one pill" action for a pack.
--
-- Paste the whole file into Supabase → SQL Editor and run it AFTER 0002.
-- Safe to re-run.
--
-- No new tables or columns: RLS policies and table GRANTs from 0001 already
-- cover everything else Phase 3 does (running_low toggle, delete, move pack).
-- The new function gets explicit GRANTs below
-- (API access is opt-in in this project, see docs/GOTCHAS.md).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- public.take_one_from_pack(pack_id)
-- Decrements packs.quantity by one in a single UPDATE, so two people pressing
-- "Взял 1 шт." at the same moment never overwrite each other (a read-then-write
-- from the app would). Quantity never goes below 0; reaching 0 also sets
-- running_low = true.
--
-- Returns the new state, or NO ROWS when the pack does not exist, is not
-- visible to the caller, or is already at 0.
--
-- SECURITY INVOKER (the default): runs with the caller's rights, so RLS
-- from 0001 (is_allowed()) applies. A stranger gets no rows.
-- ---------------------------------------------------------------------
create or replace function public.take_one_from_pack(p_pack_id uuid)
returns table (new_quantity integer, new_running_low boolean)
language sql
security invoker
set search_path = ''
as $$
  update public.packs p
     set quantity    = p.quantity - 1,
         running_low = p.running_low or p.quantity - 1 <= 0
   where p.id = p_pack_id
     and p.quantity > 0
  returning p.quantity, p.running_low;
$$;

-- Postgres grants EXECUTE to PUBLIC by default — revoke, then grant explicitly.
revoke all on function public.take_one_from_pack(uuid) from public, anon, authenticated;
grant execute on function public.take_one_from_pack(uuid) to authenticated;

commit;
