-- =====================================================================
-- Local Pharm — 0004_amdm_registry
-- Phase 4a: AMDM drug registry (Moldova) in our own database + search.
--
-- Paste the whole file into Supabase → SQL Editor and run it AFTER 0003.
-- Safe to re-run. Then load the registry rows (docs/SETUP-SUPABASE.md, step 7).
--
--   * public.amdm_registry — read-only reference table (~6 300 rows), filled
--     by the owner from the CSV built by scripts/amdm. The API can only SELECT.
--   * pg_trgm + GIN index for `search_text LIKE '%word%'`.
--   * medications.registry_code — which registry row a medication came from
--     (plain text, no foreign key: the registry is re-imported from scratch).
--   * public.add_registry_medication_with_pack(...) — like
--     add_medication_with_pack (0002, unchanged) but source = 'amdm' and
--     registry_code / barcode taken from the registry row on the server.
--
-- medications.source already allows 'amdm' (check constraint in 0001).
-- API access is opt-in in this project: explicit RLS + GRANTs below
-- (docs/GOTCHAS.md).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Extension: trigram index support for LIKE '%…%'.
-- Supabase keeps extensions in the "extensions" schema. If pg_trgm is
-- already enabled elsewhere, "if not exists" keeps it where it is; the
-- index below looks the schema up instead of assuming it.
-- ---------------------------------------------------------------------
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- public.amdm_registry
-- Column names = CSV header written by scripts/amdm/build-csv.ts.
-- ---------------------------------------------------------------------
create table if not exists public.amdm_registry (
  code              text primary key check (code ~ '^[0-9]{1,16}$'),   -- Codul medicamentului, leading zeros matter
  name              text not null check (length(trim(name)) > 0),       -- Denumirea comercială
  form              text,                                               -- Forma farmaceutică
  dose              text,                                               -- Doza, concentraţia
  volume            text,                                               -- Volum
  pack_size         text,                                               -- Divizarea ("N10x3")
  holder            text,                                               -- Deținător al CÎM
  country           text,                                               -- Ţara
  manufacturer      text,                                               -- Firma producătoare
  reg_number        text,                                               -- Numărul de înregistrare (repeats)
  reg_date          date,                                               -- Data înregistrării
  atc               text,                                               -- Codul ATC
  inn               text,                                               -- Denumirea comună internaţională (Latin)
  shelf_life_months integer check (shelf_life_months is null or shelf_life_months > 0),
  barcode           text check (barcode is null or barcode ~ '^[0-9]{8,14}$'),
  rx                boolean,                                            -- true = RX (prescription), false = OTC
  med_type          text,                                               -- Tip medicament
  -- lib/amdm/normalize.ts: lowercase ASCII of name + inn + atc + barcode.
  search_text       text not null default ''
);

create index if not exists amdm_registry_barcode_idx
  on public.amdm_registry (barcode) where barcode is not null;

do $$
declare
  trgm_schema text;
begin
  select n.nspname into trgm_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  execute format(
    'create index if not exists amdm_registry_search_text_trgm_idx
       on public.amdm_registry using gin (search_text %I.gin_trgm_ops)',
    trgm_schema
  );
end;
$$;

alter table public.amdm_registry enable row level security;

drop policy if exists amdm_registry_select on public.amdm_registry;
create policy amdm_registry_select on public.amdm_registry
  for select to authenticated
  using ((select public.is_allowed()));

-- Read-only for the API: no insert/update/delete/truncate for anyone.
-- The owner loads rows in Table Editor / SQL Editor (postgres role).
revoke all on table public.amdm_registry from anon, authenticated;
grant select on table public.amdm_registry to authenticated;

-- ---------------------------------------------------------------------
-- medications.registry_code — origin of a medication taken from the registry.
-- Covered by the table-level GRANTs and RLS policy of 0001.
-- ---------------------------------------------------------------------
alter table public.medications
  add column if not exists registry_code text
  check (registry_code is null or registry_code ~ '^[0-9]{1,16}$');

create index if not exists medications_registry_code_idx
  on public.medications (registry_code) where registry_code is not null;

-- ---------------------------------------------------------------------
-- public.add_registry_medication_with_pack(...)
-- Same as add_medication_with_pack (0002) — medication + first pack in ONE
-- transaction — but for a medication picked in the AMDM registry:
--   source = 'amdm', registry_code and barcode come from the registry row
--   (read here, not from the client). The user may have edited name,
--   substance, form, dosage and category before saving; those are taken as is.
-- Unknown or invisible code → SQLSTATE P0002, nothing is written.
--
-- SECURITY INVOKER: RLS from 0001 / above applies to every read and write.
-- ---------------------------------------------------------------------
create or replace function public.add_registry_medication_with_pack(
  p_registry_code     text,
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
  v_barcode       text;
  v_medication_id uuid;
  v_pack_id       uuid;
begin
  select r.code, r.barcode
    into v_code, v_barcode
  from public.amdm_registry r
  where r.code = p_registry_code;

  if v_code is null then
    raise exception 'AMDM registry code % not found', p_registry_code
      using errcode = 'P0002';
  end if;

  insert into public.medications
    (name, active_ingredient, form, dosage, category_id, source, registry_code, barcode)
  values (
    trim(p_name),
    nullif(trim(p_active_ingredient), ''),
    nullif(trim(p_form), ''),
    nullif(trim(p_dosage), ''),
    p_category_id,
    'amdm',
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
revoke all on function public.add_registry_medication_with_pack(
  text, text, text, text, text, uuid, uuid, integer, date
) from public, anon, authenticated;

grant execute on function public.add_registry_medication_with_pack(
  text, text, text, text, text, uuid, uuid, integer, date
) to authenticated;

commit;
