-- =====================================================================
-- Local Pharm — 0006_shopping
-- Phase 6: shopping list, menu counters, weekly expiry digest.
--
-- Paste the whole file into Supabase → SQL Editor and run it AFTER 0005.
-- Safe to re-run: tables/indexes are "if not exists", functions are
-- "create or replace", policies and the trigger are dropped and recreated.
-- Re-running never touches the digest secret or the "last sent" mark.
--
-- What it adds:
--   1. public.shopping_items         the shared shopping list (RLS + explicit GRANT)
--   2. public.nav_counts(date)       two counters for the menu badges, one round trip
--   3. public.digest_config          PRIVATE one-row table: digest secret + last sent date
--   4. public.weekly_expiry_digest   data for the weekly e-mail (called by the cron with the anon key)
--      public.digest_last_sent / public.digest_mark_sent   "once a week" bookkeeping
--
-- Project settings this file assumes (same as 0001):
--   * "Grant API access to new tables automatically" = OFF → explicit GRANTs below.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Shopping list
-- ---------------------------------------------------------------------

create table if not exists public.shopping_items (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (length(trim(title)) > 0 and length(title) <= 120),
  -- Nullable: manual items have no medication; if the medication is deleted
  -- the item stays in the list (and in the history) with its title.
  medication_id uuid references public.medications (id) on delete set null,
  reason        text not null default 'manual'
                check (reason in ('expired', 'expiring', 'running_low', 'manual')),
  note          text check (note is null or length(note) <= 500),
  -- Stamped by the trigger below from the caller's JWT, never from the request.
  created_by    text not null default '',
  created_at    timestamptz not null default now(),
  bought_at     timestamptz,
  bought_by     text,
  constraint shopping_items_bought_pair check ((bought_at is null) = (bought_by is null))
);

-- One OPEN item per medication: a double tap on "В покупки" cannot create a
-- duplicate (the second insert fails with 23505, which the app treats as "already
-- in the list"). Manual items (medication_id is null) are not limited.
create unique index if not exists shopping_items_open_medication_key
  on public.shopping_items (medication_id)
  where bought_at is null and medication_id is not null;

create index if not exists shopping_items_medication_id_idx on public.shopping_items (medication_id);
create index if not exists shopping_items_bought_at_idx
  on public.shopping_items (bought_at desc) where bought_at is not null;

-- Who and when come from the JWT, so nobody can sign an item with another
-- person's e-mail or rewrite history. SECURITY INVOKER: auth.jwt() is the caller's.
--   insert: created_by = caller; bought_by = caller if inserted as bought, else null
--   update: created_* are frozen; un-buying clears bought_*; buying stamps the caller;
--           an already bought item keeps its bought_at / bought_by.
create or replace function public.shopping_items_stamp()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if tg_op = 'INSERT' then
    new.created_by := v_email;
    new.created_at := now();
    if new.bought_at is null then
      new.bought_by := null;
    else
      new.bought_by := v_email;
    end if;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if new.bought_at is null then
      new.bought_by := null;
    elsif old.bought_at is null then
      new.bought_by := v_email;
    else
      new.bought_at := old.bought_at;
      new.bought_by := old.bought_by;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists shopping_items_stamp on public.shopping_items;
create trigger shopping_items_stamp
  before insert or update on public.shopping_items
  for each row execute function public.shopping_items_stamp();

alter table public.shopping_items enable row level security;

drop policy if exists shopping_items_allowed on public.shopping_items;
create policy shopping_items_allowed on public.shopping_items
  for all to authenticated
  using ((select public.is_allowed()))
  with check ((select public.is_allowed()));

-- Revoke first: leftover default privileges could include TRUNCATE (RLS does not cover it).
revoke all on table public.shopping_items from anon, authenticated;
grant select, insert, update, delete on table public.shopping_items to authenticated;

-- ---------------------------------------------------------------------
-- 2. Menu counters: one cheap call from the layout.
-- p_expiry_until is computed by the app (today + 30 days, lib/dates.ts), so the
-- "expires in 30 days" rule lives in one place. Packs with a date up to and
-- including that day = expired + expiring (matches expiryStatus()).
-- SECURITY INVOKER → RLS applies; a stranger gets zeros.
-- ---------------------------------------------------------------------
create or replace function public.nav_counts(p_expiry_until date)
returns table (shopping_open integer, expiry_attention integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select count(*)::integer from public.shopping_items s where s.bought_at is null),
    (select count(*)::integer from public.packs p
      where p.expiry_date is not null and p.expiry_date <= p_expiry_until);
$$;

revoke all on function public.nav_counts(date) from public, anon, authenticated;
grant execute on function public.nav_counts(date) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Weekly digest: the cron has no user session and the app must never hold the
-- service_role key. Instead the cron calls these SECURITY DEFINER functions with
-- the anon (publishable) key AND a shared secret (the same value as the CRON_SECRET
-- environment variable). Without the right secret they return nothing.
--
-- The secret lives in a private table: RLS on, no policies, no GRANT for API roles.
-- The owner puts the value in by hand (docs/SETUP-SUPABASE.md, step 1.5):
-- it never appears in the repository.
-- ---------------------------------------------------------------------
create table if not exists public.digest_config (
  id           boolean primary key default true check (id),
  secret       text,
  last_sent_on date
);

insert into public.digest_config (id) values (true) on conflict (id) do nothing;

alter table public.digest_config enable row level security;
-- intentionally NO policies
revoke all on table public.digest_config from anon, authenticated;

-- Packs that are already expired or expire within p_days (default 30) from today (UTC).
-- Returns only what the e-mail needs. Wrong secret / not configured → no rows, no hints.
create or replace function public.weekly_expiry_digest(p_secret text, p_days integer default 30)
returns table (
  medication_name  text,
  box_number       text,
  box_name         text,
  compartment_code text,
  expiry_date      date,
  quantity         integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    trim(m.name || coalesce(' ' || nullif(trim(m.dosage), ''), '')),
    b.number,
    b.name,
    c.code,
    p.expiry_date,
    p.quantity
  from public.digest_config d
  join public.packs p
    on p.expiry_date is not null
   and p.expiry_date <= (now() at time zone 'utc')::date + least(greatest(coalesce(p_days, 30), 0), 366)
  join public.medications m on m.id = p.medication_id
  join public.compartments c on c.id = p.compartment_id
  join public.boxes b on b.id = c.box_id
  where d.id
    and d.secret is not null
    and d.secret <> ''
    and p_secret is not null
    and d.secret = p_secret
  order by p.expiry_date, m.name;
$$;

-- When the last digest went out (UTC date). Wrong secret → null.
create or replace function public.digest_last_sent(p_secret text)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select d.last_sent_on
  from public.digest_config d
  where d.id
    and d.secret is not null
    and d.secret <> ''
    and p_secret is not null
    and d.secret = p_secret;
$$;

-- Remembers "sent today" (UTC). Wrong secret → does nothing.
create or replace function public.digest_mark_sent(p_secret text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.digest_config d
     set last_sent_on = (now() at time zone 'utc')::date
   where d.id
     and d.secret is not null
     and d.secret <> ''
     and p_secret is not null
     and d.secret = p_secret;
$$;

revoke all on function public.weekly_expiry_digest(text, integer) from public, anon, authenticated;
revoke all on function public.digest_last_sent(text) from public, anon, authenticated;
revoke all on function public.digest_mark_sent(text) from public, anon, authenticated;
grant execute on function public.weekly_expiry_digest(text, integer) to anon;
grant execute on function public.digest_last_sent(text) to anon;
grant execute on function public.digest_mark_sent(text) to anon;

commit;
