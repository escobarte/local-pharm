-- =====================================================================
-- Local Pharm — 0001_init
-- Schema, allowlist, RLS, grants, seed data.
--
-- Paste the whole file into Supabase → SQL Editor and run it.
-- Safe to re-run: objects are created idempotently, seeds use
-- ON CONFLICT DO NOTHING, policies are dropped and recreated.
--
-- Project settings this file assumes:
--   * "Enable RLS on new tables automatically" = ON  (RLS is also enabled here explicitly)
--   * "Grant API access to new tables automatically" = OFF
--     → every table is invisible to the Data API until it is GRANTed below.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- Allowlist of Google accounts that may use the app. Emails are stored
-- lowercase. Not exposed to the API at all: read only by public.is_allowed().
create table if not exists public.allowed_emails (
  email      text primary key check (email = lower(email) and length(trim(email)) > 3),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Storage zones ("Быстрый доступ", "Основной склад", "В дорогу").
create table if not exists public.locations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.boxes (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete restrict,
  name        text not null check (length(trim(name)) > 0),
  color       text,
  qr_token    uuid not null unique default gen_random_uuid(),
  created_at  timestamptz not null default now()
);

create table if not exists public.compartments (
  id         uuid primary key default gen_random_uuid(),
  box_id     uuid not null references public.boxes (id) on delete cascade,
  code       text not null check (length(trim(code)) > 0),
  created_at timestamptz not null default now(),
  constraint compartments_box_code_key unique (box_id, code)
);

create table if not exists public.medications (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid references public.categories (id) on delete set null,
  name              text not null check (length(trim(name)) > 0),
  active_ingredient text,
  form              text,
  dosage            text,
  barcode           text,
  indications       text,
  source            text not null default 'manual'
                    check (source in ('local', 'amdm', 'openfda', 'manual')),
  created_at        timestamptz not null default now()
);

create table if not exists public.packs (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references public.medications (id) on delete restrict,
  compartment_id uuid not null references public.compartments (id) on delete restrict,
  quantity       integer not null default 1 check (quantity >= 0),
  expiry_date    date,
  opened_at      date,
  running_low    boolean not null default false,
  photo_url      text,
  created_at     timestamptz not null default now()
);

-- Foreign-key and lookup indexes.
create index if not exists boxes_location_id_idx      on public.boxes (location_id);
create index if not exists medications_category_id_idx on public.medications (category_id);
create index if not exists medications_barcode_idx     on public.medications (barcode) where barcode is not null;
create index if not exists packs_medication_id_idx     on public.packs (medication_id);
create index if not exists packs_compartment_id_idx    on public.packs (compartment_id);
create index if not exists packs_expiry_date_idx       on public.packs (expiry_date);

-- ---------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------

-- True when the caller's JWT email (lowercased) is on the allowlist and the
-- account signed in with Google. app_metadata is set by Supabase Auth and
-- cannot be edited by the user (unlike user_metadata).
-- SECURITY DEFINER lets it read allowed_emails, which has no grants.
create or replace function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
     and exists (
       select 1
       from public.allowed_emails ae
       where ae.email = lower(coalesce(auth.jwt() ->> 'email', ''))
     );
$$;

-- Keep-alive probe for the daily Vercel Cron. Touches no data.
create or replace function public.ping()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.allowed_emails enable row level security;
alter table public.categories     enable row level security;
alter table public.locations      enable row level security;
alter table public.boxes          enable row level security;
alter table public.compartments   enable row level security;
alter table public.medications    enable row level security;
alter table public.packs          enable row level security;

-- allowed_emails: RLS on, intentionally NO policies.

-- App tables: one policy per table for role "authenticated" covering
-- select/insert/update/delete. Nothing for "anon".
-- (select ...) wrapper lets Postgres evaluate is_allowed() once per query.
drop policy if exists categories_allowed on public.categories;
create policy categories_allowed on public.categories
  for all to authenticated
  using ((select public.is_allowed()))
  with check ((select public.is_allowed()));

drop policy if exists locations_allowed on public.locations;
create policy locations_allowed on public.locations
  for all to authenticated
  using ((select public.is_allowed()))
  with check ((select public.is_allowed()));

drop policy if exists boxes_allowed on public.boxes;
create policy boxes_allowed on public.boxes
  for all to authenticated
  using ((select public.is_allowed()))
  with check ((select public.is_allowed()));

drop policy if exists compartments_allowed on public.compartments;
create policy compartments_allowed on public.compartments
  for all to authenticated
  using ((select public.is_allowed()))
  with check ((select public.is_allowed()));

drop policy if exists medications_allowed on public.medications;
create policy medications_allowed on public.medications
  for all to authenticated
  using ((select public.is_allowed()))
  with check ((select public.is_allowed()));

drop policy if exists packs_allowed on public.packs;
create policy packs_allowed on public.packs
  for all to authenticated
  using ((select public.is_allowed()))
  with check ((select public.is_allowed()));

-- ---------------------------------------------------------------------
-- Grants (API access is opt-in in this project)
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

-- allowed_emails: no access for API roles.
revoke all on table public.allowed_emails from anon, authenticated;

-- App tables: authenticated only; RLS decides which rows.
-- Revoke everything first: leftover default privileges could include
-- TRUNCATE, which RLS does not cover.
revoke all on table
  public.categories, public.locations, public.boxes,
  public.compartments, public.medications, public.packs
  from anon, authenticated;

grant select, insert, update, delete on table
  public.categories, public.locations, public.boxes,
  public.compartments, public.medications, public.packs
  to authenticated;

-- Functions: Postgres grants EXECUTE to PUBLIC by default — revoke first.
revoke all on function public.is_allowed() from public, anon, authenticated;
grant execute on function public.is_allowed() to authenticated;

revoke all on function public.ping() from public, anon, authenticated;
grant execute on function public.ping() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------

insert into public.categories (name, sort_order) values
  ('Боль и температура', 1),
  ('Простуда, горло и нос', 2),
  ('Пищеварение', 3),
  ('Аллергия', 4),
  ('Раны и перевязка', 5),
  ('Давление и сердце', 6),
  ('Витамины и добавки', 7),
  ('Детское', 8),
  ('Рецептурные и курсовые препараты', 9)
on conflict (name) do nothing;

insert into public.locations (name, sort_order) values
  ('Быстрый доступ', 1),
  ('Основной склад', 2),
  ('В дорогу', 3)
on conflict (name) do nothing;

commit;
