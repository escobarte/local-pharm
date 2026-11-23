-- =====================================================================
-- Local Pharm — 0005_medication_sources
-- Phase 4b: barcode on every way of adding a medication (scan, AMDM
-- registry, openFDA, manual) and the openFDA source.
--
-- Paste the whole file into Supabase → SQL Editor and run it AFTER 0004.
-- Safe to re-run.
--
-- No new tables or columns. Indexes already exist and are reused:
--   medications_barcode_idx       (0001) — lookup by barcode (scan, duplicates)
--   medications_registry_code_idx (0004) — duplicates of an AMDM row
-- The new function gets explicit GRANTs below (API access is opt-in in this
-- project, see docs/GOTCHAS.md). Functions of 0002 and 0004 are unchanged and
-- still work.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- public.add_medication_entry_with_pack(...)
-- Medication + first pack in ONE transaction (like 0002 / 0004) for any source:
--   'manual'  — typed by the user;
--   'openfda' — prefilled from the openFDA label API, then edited by the user
--               (the values are exactly as trustworthy as a manual entry);
--   'amdm'    — picked in the AMDM registry: the code must exist (read here,
--               under RLS), otherwise SQLSTATE P0002 and nothing is written.
-- p_barcode is optional, normalized by the app (EAN-13 or EAN-8); the format
-- is re-checked here. registry_code is stored only for 'amdm'.
--
-- SECURITY INVOKER: RLS from 0001 / 0004 applies to every read and write.
-- ---------------------------------------------------------------------
create or replace function public.add_medication_entry_with_pack(
  p_source            text,
  p_registry_code     text,
  p_barcode           text,
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
  v_code          text;
  v_barcode       text := nullif(trim(p_barcode), '');
  v_medication_id uuid;
  v_pack_id       uuid;
begin
  if p_source is null or p_source not in ('manual', 'amdm', 'openfda') then
    raise exception 'unsupported source %', p_source using errcode = '22023';
  end if;

  if v_barcode is not null and v_barcode !~ '^([0-9]{8}|[0-9]{13})$' then
    raise exception 'barcode must be EAN-8 or EAN-13' using errcode = '22023';
  end if;

  if p_source = 'amdm' then
    select r.code into v_code
    from public.amdm_registry r
    where r.code = p_registry_code;

    if v_code is null then
      raise exception 'AMDM registry code % not found', p_registry_code
        using errcode = 'P0002';
    end if;
  end if;

  insert into public.medications
    (name, active_ingredient, form, dosage, category_id, source, registry_code, barcode)
  values (
    trim(p_name),
    nullif(trim(p_active_ingredient), ''),
    nullif(trim(p_form), ''),
    nullif(trim(p_dosage), ''),
    p_category_id,
    p_source,
    v_code,
    v_barcode
  )
  returning id into v_medication_id;

  insert into public.packs (medication_id, compartment_id, quantity, expiry_date)
  values (v_medication_id, p_compartment_id, p_quantity, p_expiry_date)
  returning id into v_pack_id;

  return query select v_medication_id, v_pack_id;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default — revoke, then grant explicitly.
revoke all on function public.add_medication_entry_with_pack(
  text, text, text, text, text, text, text, uuid, uuid, integer, date
) from public, anon, authenticated;

grant execute on function public.add_medication_entry_with_pack(
  text, text, text, text, text, text, text, uuid, uuid, integer, date
) to authenticated;

commit;
