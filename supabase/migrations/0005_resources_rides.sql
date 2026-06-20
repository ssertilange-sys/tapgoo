-- ============================================================
-- 0005 — Ressources génériques, trajets, réservations + RPC métier
-- Cœur transactionnel du covoiturage.
-- ============================================================

-- ------------------------------------------------------------
-- Ressource générique : supertype de toute ressource de mobilité
-- (trajet, borne, parking, garage…). Porte la visibilité et le prix conseillé.
-- ------------------------------------------------------------
create table if not exists public.mobility_resources (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id),
  community_id uuid references public.communities(id),
  resource_type public.resource_type not null,
  title text not null,
  description text,
  visibility public.visibility_level not null default 'public',
  address text,
  location geography(Point,4326),
  suggested_price_cents int not null default 0,
  currency char(3) not null default 'EUR',
  payment_mode public.payment_mode not null default 'outside_tapgoo',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_owner_check check (owner_user_id is not null or organization_id is not null)
);

create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid unique references public.mobility_resources(id) on delete cascade,
  driver_id uuid not null references public.profiles(id),
  vehicle_id uuid references public.user_vehicles(id),
  organization_id uuid references public.organizations(id),
  community_id uuid references public.communities(id),
  origin_label text not null,
  destination_label text not null,
  origin geography(Point,4326),
  destination geography(Point,4326),
  departure_time timestamptz not null,
  arrival_time timestamptz,
  recurrence_rule text,                 -- iCal RRULE pour les trajets récurrents
  seats_total int not null check (seats_total between 1 and 8),
  seats_available int not null check (seats_available >= 0),
  detour_minutes_max int not null default 10,
  distance_km numeric(8,2),
  suggested_price_cents int not null default 0,
  status text not null default 'published',
  evidence_mode text not null default 'mutual_validation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ride_stops (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  stop_order int not null,
  label text not null,
  location geography(Point,4326),
  planned_time timestamptz,
  unique(ride_id, stop_order)
);

create table if not exists public.ride_bookings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id),
  status public.booking_status not null default 'pending',
  seats int not null default 1 check (seats between 1 and 8),
  expected_direct_payment_cents int not null default 0,
  payment_mode public.payment_mode not null default 'outside_tapgoo',
  payment_confirmation_by_user boolean not null default false,
  checkin_at timestamptz,
  checkout_at timestamptz,
  passenger_validation_at timestamptz,
  driver_validation_at timestamptz,
  fmd_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(ride_id, passenger_id)
);

drop trigger if exists trg_resources_touch on public.mobility_resources;
create trigger trg_resources_touch before update on public.mobility_resources
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_rides_touch on public.rides;
create trigger trg_rides_touch before update on public.rides
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_ride_bookings_touch on public.ride_bookings;
create trigger trg_ride_bookings_touch before update on public.ride_bookings
  for each row execute function public.touch_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.mobility_resources enable row level security;
alter table public.rides enable row level security;
alter table public.ride_stops enable row level security;
alter table public.ride_bookings enable row level security;

-- Ressources : lecture selon la visibilité ; écriture par le propriétaire ou
-- les gestionnaires de l'organisation.
drop policy if exists resources_read on public.mobility_resources;
create policy resources_read on public.mobility_resources
  for select to authenticated using (
    is_active and (
      visibility = 'public' or owner_user_id = auth.uid()
      or (organization_id is not null and public.is_org_member(organization_id))
      or (community_id is not null and public.is_community_member(community_id))
      or public.is_platform_admin()
    )
  );
drop policy if exists resources_read_anon on public.mobility_resources;
create policy resources_read_anon on public.mobility_resources
  for select to anon using (is_active and visibility = 'public');
drop policy if exists resources_owner_write on public.mobility_resources;
create policy resources_owner_write on public.mobility_resources
  for all to authenticated
  using (owner_user_id = auth.uid()
    or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','facility']::public.member_role[]))
    or public.is_platform_admin())
  with check (owner_user_id = auth.uid()
    or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','facility']::public.member_role[]))
    or public.is_platform_admin());

-- Trajets : visibles si publiés/terminés et ressource visible ; le conducteur
-- voit toujours les siens. Lecture anonyme des trajets publics (recherche sans compte).
drop policy if exists rides_read on public.rides;
create policy rides_read on public.rides
  for select to authenticated using (
    driver_id = auth.uid() or public.is_platform_admin()
    or (status in ('published','completed') and exists (
      select 1 from public.mobility_resources mr
      where mr.id = rides.resource_id and mr.is_active and (
        mr.visibility = 'public'
        or (mr.organization_id is not null and public.is_org_member(mr.organization_id))
        or (mr.community_id is not null and public.is_community_member(mr.community_id))
      )))
  );
drop policy if exists rides_read_anon on public.rides;
create policy rides_read_anon on public.rides
  for select to anon using (
    status = 'published' and exists (
      select 1 from public.mobility_resources mr
      where mr.id = rides.resource_id and mr.is_active and mr.visibility = 'public')
  );
drop policy if exists rides_insert_driver on public.rides;
create policy rides_insert_driver on public.rides
  for insert to authenticated with check (driver_id = auth.uid());
drop policy if exists rides_update_driver on public.rides;
create policy rides_update_driver on public.rides
  for update to authenticated using (
    driver_id = auth.uid()
    or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]))
    or public.is_platform_admin()
  );

-- Arrêts : lisibles avec le trajet ; modifiables par le conducteur. (Le master
-- schema laissait cette table verrouillée sans aucune policy.)
drop policy if exists ride_stops_read on public.ride_stops;
create policy ride_stops_read on public.ride_stops
  for select to authenticated using (
    exists (select 1 from public.rides r where r.id = ride_id
            and (r.driver_id = auth.uid() or r.status in ('published','completed')))
  );
drop policy if exists ride_stops_write on public.ride_stops;
create policy ride_stops_write on public.ride_stops
  for all to authenticated
  using (exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = auth.uid()))
  with check (exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = auth.uid()));

-- Réservations : visibles par le passager, le conducteur du trajet, les
-- gestionnaires RH/paie/RSE de l'organisation, et l'admin.
drop policy if exists ride_bookings_read on public.ride_bookings;
create policy ride_bookings_read on public.ride_bookings
  for select to authenticated using (
    passenger_id = auth.uid()
    or exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = auth.uid())
    or exists (select 1 from public.rides r where r.id = ride_id and r.organization_id is not null
               and public.has_org_role(r.organization_id, array['owner','admin','manager','payroll','rse']::public.member_role[]))
    or public.is_platform_admin()
  );
drop policy if exists ride_bookings_passenger_insert on public.ride_bookings;
create policy ride_bookings_passenger_insert on public.ride_bookings
  for insert to authenticated with check (passenger_id = auth.uid());
drop policy if exists ride_bookings_update on public.ride_bookings;
create policy ride_bookings_update on public.ride_bookings
  for update to authenticated using (
    passenger_id = auth.uid()
    or exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = auth.uid())
    or public.is_platform_admin()
  );

-- ============================================================
-- RPC MÉTIER (SECURITY DEFINER, vérifient toujours auth.uid())
-- ============================================================

-- Publie un trajet : crée la ressource ET le trajet en une transaction.
create or replace function public.create_ride(
  p_origin_label text,
  p_destination_label text,
  p_departure_time timestamptz,
  p_seats_total int,
  p_price_cents int default 0,
  p_vehicle_id uuid default null,
  p_organization_id uuid default null,
  p_community_id uuid default null,
  p_visibility public.visibility_level default 'public',
  p_distance_km numeric default null,
  p_recurrence_rule text default null,
  p_detour_minutes_max int default 10,
  p_origin_lng double precision default null,
  p_origin_lat double precision default null,
  p_dest_lng double precision default null,
  p_dest_lat double precision default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_resource_id uuid;
  v_ride_id uuid;
  v_origin geography(Point,4326);
  v_dest geography(Point,4326);
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;
  if coalesce(trim(p_origin_label),'') = '' or coalesce(trim(p_destination_label),'') = '' then
    raise exception 'Départ et arrivée obligatoires.';
  end if;
  if p_departure_time is null then raise exception 'Date de départ obligatoire.'; end if;
  if p_seats_total is null or p_seats_total < 1 or p_seats_total > 8 then
    raise exception 'Nombre de places invalide.';
  end if;
  -- Le membre ne peut publier au nom d'une organisation que s'il y a un rôle de gestion.
  if p_organization_id is not null
     and not public.has_org_role(p_organization_id, array['owner','admin','manager','facility']::public.member_role[]) then
    raise exception 'Action non autorisée pour cette organisation.';
  end if;

  if p_origin_lng is not null and p_origin_lat is not null then
    v_origin := ST_SetSRID(ST_MakePoint(p_origin_lng, p_origin_lat),4326)::geography;
  end if;
  if p_dest_lng is not null and p_dest_lat is not null then
    v_dest := ST_SetSRID(ST_MakePoint(p_dest_lng, p_dest_lat),4326)::geography;
  end if;

  insert into public.mobility_resources(
    owner_user_id, organization_id, community_id, resource_type, title,
    visibility, location, suggested_price_cents, payment_mode, is_active)
  values (
    v_me, p_organization_id, p_community_id, 'ride',
    p_origin_label || ' → ' || p_destination_label,
    p_visibility, v_origin, coalesce(p_price_cents,0), 'outside_tapgoo', true)
  returning id into v_resource_id;

  insert into public.rides(
    resource_id, driver_id, vehicle_id, organization_id, community_id,
    origin_label, destination_label, origin, destination, departure_time,
    recurrence_rule, seats_total, seats_available, detour_minutes_max,
    distance_km, suggested_price_cents, status)
  values (
    v_resource_id, v_me, p_vehicle_id, p_organization_id, p_community_id,
    trim(p_origin_label), trim(p_destination_label), v_origin, v_dest, p_departure_time,
    p_recurrence_rule, p_seats_total, p_seats_total, coalesce(p_detour_minutes_max,10),
    p_distance_km, coalesce(p_price_cents,0), 'published')
  returning id into v_ride_id;

  return v_ride_id;
end; $$;

-- Demande de réservation (statut 'pending', sans décrément : la place n'est
-- réservée qu'à l'acceptation par le conducteur).
create or replace function public.book_ride(p_ride_id uuid, p_seats int default 1)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_ride record;
  v_booking_id uuid;
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;
  if p_seats < 1 then raise exception 'Nombre de places invalide.'; end if;

  select * into v_ride from public.rides where id = p_ride_id and status = 'published';
  if not found then raise exception 'Trajet introuvable ou indisponible.'; end if;
  if v_ride.driver_id = v_me then raise exception 'Vous ne pouvez pas réserver votre propre trajet.'; end if;
  if v_ride.seats_available < p_seats then raise exception 'Plus assez de places disponibles.'; end if;

  insert into public.ride_bookings(ride_id, passenger_id, status, seats,
    expected_direct_payment_cents, payment_mode)
  values (p_ride_id, v_me, 'pending', p_seats,
    v_ride.suggested_price_cents * p_seats, 'outside_tapgoo')
  returning id into v_booking_id;

  return v_booking_id;
exception when unique_violation then
  raise exception 'Vous avez déjà une réservation sur ce trajet.';
end; $$;

-- Le conducteur accepte ou refuse une demande. L'acceptation décrémente les
-- sièges sous verrou (anti-surréservation).
create or replace function public.respond_to_booking(p_booking_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_booking record;
  v_ride record;
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;

  select * into v_booking from public.ride_bookings where id = p_booking_id;
  if not found then raise exception 'Réservation introuvable.'; end if;

  select * into v_ride from public.rides where id = v_booking.ride_id for update;
  if v_ride.driver_id is distinct from v_me then raise exception 'Action non autorisée.'; end if;
  if v_booking.status <> 'pending' then raise exception 'Cette demande a déjà été traitée.'; end if;

  if p_accept then
    if v_ride.seats_available < v_booking.seats then raise exception 'Plus assez de places disponibles.'; end if;
    update public.rides set seats_available = seats_available - v_booking.seats, updated_at = now()
      where id = v_ride.id;
    update public.ride_bookings set status = 'accepted', updated_at = now() where id = p_booking_id;
  else
    update public.ride_bookings set status = 'rejected', updated_at = now() where id = p_booking_id;
  end if;
end; $$;

-- Annulation par le passager (restitue les sièges si la réservation était acceptée).
create or replace function public.cancel_my_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_booking record;
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;

  select * into v_booking from public.ride_bookings where id = p_booking_id;
  if not found then raise exception 'Réservation introuvable.'; end if;
  if v_booking.passenger_id is distinct from v_me then raise exception 'Action non autorisée.'; end if;
  if v_booking.status = 'cancelled' then return; end if;

  if v_booking.status = 'accepted' then
    update public.rides set seats_available = seats_available + v_booking.seats, updated_at = now()
      where id = v_booking.ride_id;
  end if;
  update public.ride_bookings set status = 'cancelled', updated_at = now() where id = p_booking_id;
end; $$;

-- Validation mutuelle : chaque partie valide son côté ; quand les deux ont
-- validé, le trajet est 'completed' et marqué éligible FMD (preuve générée plus tard).
create or replace function public.validate_ride_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_booking record;
  v_ride record;
  v_is_driver boolean;
  v_is_passenger boolean;
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;

  select * into v_booking from public.ride_bookings where id = p_booking_id;
  if not found then raise exception 'Réservation introuvable.'; end if;
  select * into v_ride from public.rides where id = v_booking.ride_id;

  v_is_driver := (v_ride.driver_id = v_me);
  v_is_passenger := (v_booking.passenger_id = v_me);
  if not (v_is_driver or v_is_passenger) then raise exception 'Action non autorisée.'; end if;
  if v_booking.status not in ('accepted','completed') then
    raise exception 'La réservation doit être acceptée avant validation.';
  end if;

  if v_is_driver then
    update public.ride_bookings set driver_validation_at = coalesce(driver_validation_at, now()), updated_at = now()
      where id = p_booking_id;
  end if;
  if v_is_passenger then
    update public.ride_bookings set passenger_validation_at = coalesce(passenger_validation_at, now()), updated_at = now()
      where id = p_booking_id;
  end if;

  update public.ride_bookings
    set status = 'completed', fmd_eligible = true, updated_at = now()
    where id = p_booking_id
      and driver_validation_at is not null and passenger_validation_at is not null;
end; $$;

revoke all on function public.create_ride(text,text,timestamptz,int,int,uuid,uuid,uuid,public.visibility_level,numeric,text,int,double precision,double precision,double precision,double precision) from public;
grant execute on function public.create_ride(text,text,timestamptz,int,int,uuid,uuid,uuid,public.visibility_level,numeric,text,int,double precision,double precision,double precision,double precision) to authenticated;
revoke all on function public.book_ride(uuid,int) from public;
grant execute on function public.book_ride(uuid,int) to authenticated;
revoke all on function public.respond_to_booking(uuid,boolean) from public;
grant execute on function public.respond_to_booking(uuid,boolean) to authenticated;
revoke all on function public.cancel_my_booking(uuid) from public;
grant execute on function public.cancel_my_booking(uuid) to authenticated;
revoke all on function public.validate_ride_booking(uuid) from public;
grant execute on function public.validate_ride_booking(uuid) to authenticated;
