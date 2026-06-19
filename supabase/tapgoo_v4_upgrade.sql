-- ============================================================
-- TAPGOO v4 — Mise à niveau Supabase
-- À exécuter dans l'éditeur SQL de Supabase, APRÈS tapgoo_schema.sql.
-- Idempotent : peut être relancé sans danger.
-- ============================================================

-- 1) Colonnes profil manquantes (utilisées par la page Profil)
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists vehicle text;
alter table public.profiles add column if not exists company text;
alter table public.profiles add column if not exists bio text;

-- 2) Distance estimée d'un trajet (pour les stats CO2 du dashboard)
alter table public.rides add column if not exists distance_km numeric check (distance_km is null or distance_km >= 0);

-- 3) Lecture publique limitée
-- 3a. Les visiteurs non connectés peuvent consulter les trajets actifs
--     et les bornes disponibles (comme BlaBlaCar : recherche sans compte).
drop policy if exists rides_select_anon_active on public.rides;
create policy rides_select_anon_active on public.rides
  for select to anon using (status = 'active');

drop policy if exists charging_stations_select_anon on public.charging_stations;
create policy charging_stations_select_anon on public.charging_stations
  for select to anon using (status = 'available');

-- 3b. Les membres ne peuvent lire QUE leur propre profil complet
--     (policy profiles_select_own du schéma de base). Les informations
--     publiques nécessaires pour afficher un conducteur (nom, avatar, ville)
--     passent EXCLUSIVEMENT par la vue public_profiles ci-dessous, qui
--     n'expose jamais le téléphone ni l'email.
create or replace view public.public_profiles
  with (security_invoker = off) as
  select id, full_name, avatar_url, city from public.profiles;
grant select on public.public_profiles to authenticated, anon;

-- Sécurité : on supprime toute policy permissive qui exposerait l'intégralité
-- de la table profiles (téléphone, email) aux autres membres connectés.
-- La lecture des profils tiers se fait uniquement via la vue public_profiles.
drop policy if exists profiles_select_public_fields on public.profiles;

-- 4) Suppression de trajet et annulation de réservation (RPC sécurisées)
create or replace function public.delete_my_ride(p_ride_id uuid, p_driver_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_driver_id is distinct from auth.uid() then
    raise exception 'Action non autorisée.';
  end if;
  update public.rides set status = 'cancelled', updated_at = now()
  where id = p_ride_id and driver_id = auth.uid();
end; $$;

create or replace function public.cancel_ride_booking(p_booking_id uuid, p_passenger_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_ride_id uuid;
begin
  if p_passenger_id is distinct from auth.uid() then
    raise exception 'Action non autorisée.';
  end if;
  update public.ride_bookings set status = 'cancelled', updated_at = now()
  where id = p_booking_id and passenger_id = auth.uid() and status <> 'cancelled'
  returning ride_id into v_ride_id;
  if v_ride_id is not null then
    update public.rides set seats_available = seats_available + 1, updated_at = now()
    where id = v_ride_id;
  end if;
end; $$;

-- 5) MESSAGERIE -------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid references public.rides(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Un membre ne voit que ses conversations
drop policy if exists conversations_select_member on public.conversations;
create policy conversations_select_member on public.conversations
  for select to authenticated using (
    exists (select 1 from public.conversation_members m
            where m.conversation_id = conversations.id and m.user_id = auth.uid())
  );

drop policy if exists conversation_members_select_own on public.conversation_members;
create policy conversation_members_select_own on public.conversation_members
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.conversation_members m2
               where m2.conversation_id = conversation_members.conversation_id
                 and m2.user_id = auth.uid())
  );

drop policy if exists messages_select_member on public.messages;
create policy messages_select_member on public.messages
  for select to authenticated using (
    exists (select 1 from public.conversation_members m
            where m.conversation_id = messages.conversation_id and m.user_id = auth.uid())
  );

drop policy if exists messages_insert_member on public.messages;
create policy messages_insert_member on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (select 1 from public.conversation_members m
                where m.conversation_id = messages.conversation_id and m.user_id = auth.uid())
  );

-- Démarrer (ou retrouver) une conversation 1-à-1
create or replace function public.start_conversation(p_other_user uuid, p_ride_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_conv uuid;
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;
  if p_other_user is null or p_other_user = v_me then
    raise exception 'Destinataire invalide.';
  end if;
  if not exists (select 1 from public.profiles where id = p_other_user) then
    raise exception 'Membre introuvable.';
  end if;

  select c.id into v_conv
  from public.conversations c
  join public.conversation_members a on a.conversation_id = c.id and a.user_id = v_me
  join public.conversation_members b on b.conversation_id = c.id and b.user_id = p_other_user
  limit 1;

  if v_conv is null then
    insert into public.conversations (ride_id) values (p_ride_id) returning id into v_conv;
    insert into public.conversation_members (conversation_id, user_id)
    values (v_conv, v_me), (v_conv, p_other_user);
  end if;

  return v_conv;
end; $$;

-- Lister ses conversations avec l'autre membre + dernier message
create or replace function public.list_conversations()
returns table (
  conversation_id uuid,
  other_name text,
  other_avatar text,
  last_body text,
  last_at timestamptz
) language sql security definer set search_path = public as $$
  select c.id,
         p.full_name,
         p.avatar_url,
         lm.body,
         lm.created_at
  from public.conversations c
  join public.conversation_members me
    on me.conversation_id = c.id and me.user_id = auth.uid()
  join public.conversation_members other
    on other.conversation_id = c.id and other.user_id <> auth.uid()
  join public.profiles p on p.id = other.user_id
  left join lateral (
    select body, created_at from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc limit 1
  ) lm on true
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

revoke all on function public.start_conversation(uuid, uuid) from public;
grant execute on function public.start_conversation(uuid, uuid) to authenticated;
revoke all on function public.list_conversations() from public;
grant execute on function public.list_conversations() to authenticated;
