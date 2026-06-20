-- ============================================================
-- 0002 — Identité, confiance & RGPD
-- Séparation stricte données publiques / privées (privacy by design).
-- ============================================================

-- ------------------------------------------------------------
-- Outils transverses
-- ------------------------------------------------------------

-- Met à jour updated_at à chaque UPDATE (à brancher sur les tables concernées).
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ------------------------------------------------------------
-- Profil PUBLIC (jamais de téléphone ni d'identité légale ici)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_type public.account_type not null default 'citizen',
  display_name text not null,
  avatar_url text,
  phone_verified boolean not null default false,
  email_verified boolean not null default false,
  default_city text,
  default_country text not null default 'FR',
  trust_score numeric(6,2) not null default 0,
  is_suspended boolean not null default false,
  suspension_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vrai si l'appelant est admin plateforme et non suspendu.
-- SECURITY DEFINER : contourne la RLS pour éviter toute récursion dans les policies.
-- Défini après profiles (une fonction SQL est validée à la création).
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_type = 'platform_admin' and not p.is_suspended
  );
$$;

-- Profil PRIVÉ : accessible au seul propriétaire (+ admin plateforme).
create table if not exists public.user_private_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  legal_first_name text,
  legal_last_name text,
  birthdate date,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text default 'FR',
  emergency_contact text,
  accessibility_needs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  language text not null default 'fr',
  notification_email boolean not null default true,
  notification_push boolean not null default true,
  notification_sms boolean not null default false,
  show_precise_location boolean not null default false,
  default_payment_mode public.payment_mode not null default 'outside_tapgoo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  address text,
  city text,
  postal_code text,
  country text default 'FR',
  location geography(Point,4326),
  is_default boolean not null default false,
  -- minimisation géoloc : 'approximate' par défaut, 'precise' sur consentement.
  precision_level text not null default 'approximate',
  created_at timestamptz not null default now()
);

create table if not exists public.user_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  vehicle_type text not null default 'car',
  energy text,
  seats int check (seats between 1 and 9),
  plate_hash text,           -- jamais la plaque en clair
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Consentements RGPD versionnés par finalité (preuve d'opt-in/opt-out).
create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  purpose public.consent_purpose not null,
  granted boolean not null,
  version text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Journal d'audit des actions sensibles (exports paie, suspensions, rôles…).
create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_id uuid references public.profiles(id),
  organization_id uuid,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  ip inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.security_events (
  id bigserial primary key,
  user_id uuid references public.profiles(id),
  event_type text not null,
  severity text not null default 'info',
  ip inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Triggers updated_at
-- ------------------------------------------------------------
drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_private_touch on public.user_private_profiles;
create trigger trg_private_touch before update on public.user_private_profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_settings_touch on public.user_settings;
create trigger trg_settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- Création automatique du profil à l'inscription
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email_verified)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      nullif(split_part(coalesce(new.email,''), '@', 1), ''),
      'Membre TAPGOO'
    ),
    (new.email_confirmed_at is not null)
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_private_profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Vue PUBLIQUE des profils (seul accès aux autres membres)
-- security_invoker = off : lit profiles avec les droits du propriétaire de la
-- vue, en n'exposant QUE les champs non sensibles.
-- ------------------------------------------------------------
create or replace view public.public_profiles
  with (security_invoker = off) as
  select id, display_name, avatar_url, default_city, trust_score,
         account_type, phone_verified, email_verified
  from public.profiles
  where not is_suspended;
grant select on public.public_profiles to authenticated, anon;

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.user_private_profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_addresses enable row level security;
alter table public.user_vehicles enable row level security;
alter table public.user_consents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.security_events enable row level security;

-- profiles : on ne lit que SON profil complet (les autres via public_profiles).
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_platform_admin());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Tables strictement personnelles : tout réservé au propriétaire (+ admin).
drop policy if exists private_profile_owner on public.user_private_profiles;
create policy private_profile_owner on public.user_private_profiles
  for all to authenticated
  using (user_id = auth.uid() or public.is_platform_admin())
  with check (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists user_settings_owner on public.user_settings;
create policy user_settings_owner on public.user_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_addresses_owner on public.user_addresses;
create policy user_addresses_owner on public.user_addresses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_vehicles_owner on public.user_vehicles;
create policy user_vehicles_owner on public.user_vehicles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_consents_owner on public.user_consents;
create policy user_consents_owner on public.user_consents
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Audit & sécurité : lecture par le concerné ou l'admin ; écriture réservée
-- aux fonctions SECURITY DEFINER (donc aucune policy d'insert côté client).
drop policy if exists audit_logs_read on public.audit_logs;
create policy audit_logs_read on public.audit_logs
  for select to authenticated using (actor_id = auth.uid() or public.is_platform_admin());

drop policy if exists security_events_read on public.security_events;
create policy security_events_read on public.security_events
  for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());
