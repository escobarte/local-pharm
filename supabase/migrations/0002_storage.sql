-- =====================================================================
-- Local Pharm — 0002_storage
-- Phase 2: box number + atomic "add medication with pack" function.
--
-- Paste the whole file into Supabase → SQL Editor and run it AFTER 0001.
-- Safe to re-run.
--
-- No new tables: RLS policies and table GRANTs from 0001 already cover
-- the new column. The new function gets explicit GRANTs below
-- (API access is opt-in in this project, see docs/GOTCHAS.md).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- boxes.number — human-readable box number printed on the label ("1", "2B").
-- Optional; text so that labels like "2B" are possible.
-- ---------------------------------------------------------------------
alter table public.boxes
  add column if not exists number text
  check (number is null or length(trim(number)) between 1 and 6);

-- ---------------------------------------------------------------------
-- public.add_medication_with_pack(...)
-- Creates a manual medication and its first pack in ONE transaction, so a
-- failed pack insert can never leave an orphan medication behind.
--
-- SECURITY INVOKER (the default): runs with the caller's rights, so RLS
-- from 0001 (is_allowed()) applies to both inserts. A stranger gets an
-- RLS error, not data.
-- ---------------------------------------------------------------------
create or replace function public.add_medication_with_pack(
  p_name              text,
  p_active_ingredient text,
  p_form              text,
  p_dosage            text,
  p_category_id       uuid,
  p_compartment_id    uuid,
  p_quantity          integer,
  p_expiry_date       date
)
returns table (new_medication_id uuid, new_pack_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_medication_id uuid;
  v_pack_id       uuid;
begin
  insert into public.medications (name, active_ingredient, form, dosage, category_id, source)
  values (
    trim(p_name),
    nullif(trim(p_active_ingredient), ''),
    nullif(trim(p_form), ''),
    nullif(trim(p_dosage), ''),
    p_category_id,
    'manual'
  )
  returning id into v_medication_id;

  insert into public.packs (medication_id, compartment_id, quantity, expiry_date)
  values (v_medication_id, p_compartment_id, p_quantity, p_expiry_date)
  returning id into v_pack_id;

  return query select v_medication_id, v_pack_id;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default — revoke, then grant explicitly.
revoke all on function public.add_medication_with_pack(
  text, text, text, text, uuid, uuid, integer, date
) from public, anon, authenticated;

grant execute on function public.add_medication_with_pack(
  text, text, text, text, uuid, uuid, integer, date
) to authenticated;

commit;
