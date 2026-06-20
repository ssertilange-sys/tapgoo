-- ============================================================
-- 0006 — Bornes de recharge & parking/garage
-- Ressources « créneau horaire » avec anti-chevauchement.
-- ============================================================

create table if not exists public.charging_stations (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid unique references public.mobility_resources(id) on delete cascade,
  owner_user_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id),
  site_id uuid references public.organization_sites(id),
  name text not null,
  address text,
  location geography(Point,4326),
  connector_type text,
  power_kw numeric(6,2),
  access_instructions text,
  suggested_price_cents_per_hour int default 0,
  suggested_price_cents_per_kwh int default 0,
  visibility public.visibility_level default 'public',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.charging_bookings (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.charging_stations(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  vehicle_label text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'pending',
  expected_direct_payment_cents int not null default 0,
  payment_mode public.payment_mode not null default 'outside_tapgoo',
  kwh_reported numeric(8,2),
  created_at timestamptz default now(),
  constraint charging_time_check check (ends_at > starts_at)
);

create table if not exists public.parking_spots (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid unique references public.mobility_resources(id) on delete cascade,
  owner_user_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id),
  site_id uuid references public.organization_sites(id),
  title text not null,
  address text,
  location geography(Point,4326),
  spot_type text default 'standard',
  max_height_cm int,
  access_instructions text,
  suggested_price_cents_per_hour int default 0,
  visibility public.visibility_level default 'public',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.parking_bookings (
  id uuid primary key default gen_random_uuid(),
  parking_spot_id uuid not null references public.parking_spots(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  vehicle_plate_hash text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'pending',
  expected_direct_payment_cents int not null default 0,
  payment_mode public.payment_mode not null default 'outside_tapgoo',
  created_at timestamptz default now(),
  constraint parking_time_check check (ends_at > starts_at)
);

-- ------------------------------------------------------------
-- Anti-chevauchement : on refuse une réservation qui recouvre un créneau
-- déjà pending/accepted sur la même borne / place.
-- ------------------------------------------------------------
create or replace function public.prevent_charging_overlap()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from public.charging_bookings cb
    where cb.station_id = new.station_id
      and cb.status in ('pending','accepted')
      and tstzrange(cb.starts_at, cb.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
      and cb.id <> coalesce(new.id, gen_random_uuid())
  ) then
    raise exception 'Borne déjà réservée sur ce créneau.';
  end if;
  return new;
end; $$;

drop trigger if exists trg_prevent_charging_overlap on public.charging_bookings;
create trigger trg_prevent_charging_overlap before insert or update on public.charging_bookings
  for each row execute function public.prevent_charging_overlap();

create or replace function public.prevent_parking_overlap()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from public.parking_bookings pb
    where pb.parking_spot_id = new.parking_spot_id
      and pb.status in ('pending','accepted')
      and tstzrange(pb.starts_at, pb.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
      and pb.id <> coalesce(new.id, gen_random_uuid())
  ) then
    raise exception 'Place déjà réservée sur ce créneau.';
  end if;
  return new;
end; $$;

drop trigger if exists trg_prevent_parking_overlap on public.parking_bookings;
create trigger trg_prevent_parking_overlap before insert or update on public.parking_bookings
  for each row execute function public.prevent_parking_overlap();

-- ============================================================
-- RLS
-- ============================================================
alter table public.charging_stations enable row level security;
alter table public.charging_bookings enable row level security;
alter table public.parking_spots enable row level security;
alter table public.parking_bookings enable row level security;

-- Bornes
drop policy if exists charging_read on public.charging_stations;
create policy charging_read on public.charging_stations
  for select to authenticated using (
    is_active and (visibility='public' or owner_user_id=auth.uid()
      or (organization_id is not null and public.is_org_member(organization_id)) or public.is_platform_admin())
  );
drop policy if exists charging_read_anon on public.charging_stations;
create policy charging_read_anon on public.charging_stations
  for select to anon using (is_active and visibility='public');
drop policy if exists charging_owner_write on public.charging_stations;
create policy charging_owner_write on public.charging_stations
  for all to authenticated
  using (owner_user_id=auth.uid()
    or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','facility']::public.member_role[])) or public.is_platform_admin())
  with check (owner_user_id=auth.uid()
    or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','facility']::public.member_role[])) or public.is_platform_admin());

drop policy if exists charging_bookings_parties on public.charging_bookings;
create policy charging_bookings_parties on public.charging_bookings
  for select to authenticated using (
    user_id=auth.uid()
    or exists(select 1 from public.charging_stations s where s.id=station_id
              and (s.owner_user_id=auth.uid()
                or (s.organization_id is not null and public.has_org_role(s.organization_id, array['owner','admin','manager','facility']::public.member_role[]))))
    or public.is_platform_admin()
  );
drop policy if exists charging_bookings_user_insert on public.charging_bookings;
create policy charging_bookings_user_insert on public.charging_bookings
  for insert to authenticated with check (user_id=auth.uid());
drop policy if exists charging_bookings_update on public.charging_bookings;
create policy charging_bookings_update on public.charging_bookings
  for update to authenticated using (
    user_id=auth.uid()
    or exists(select 1 from public.charging_stations s where s.id=station_id and s.owner_user_id=auth.uid())
    or public.is_platform_admin()
  );

-- Parking
drop policy if exists parking_read on public.parking_spots;
create policy parking_read on public.parking_spots
  for select to authenticated using (
    is_active and (visibility='public' or owner_user_id=auth.uid()
      or (organization_id is not null and public.is_org_member(organization_id)) or public.is_platform_admin())
  );
drop policy if exists parking_read_anon on public.parking_spots;
create policy parking_read_anon on public.parking_spots
  for select to anon using (is_active and visibility='public');
drop policy if exists parking_owner_write on public.parking_spots;
create policy parking_owner_write on public.parking_spots
  for all to authenticated
  using (owner_user_id=auth.uid()
    or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','facility']::public.member_role[])) or public.is_platform_admin())
  with check (owner_user_id=auth.uid()
    or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','facility']::public.member_role[])) or public.is_platform_admin());

drop policy if exists parking_bookings_parties on public.parking_bookings;
create policy parking_bookings_parties on public.parking_bookings
  for select to authenticated using (
    user_id=auth.uid()
    or exists(select 1 from public.parking_spots s where s.id=parking_spot_id
              and (s.owner_user_id=auth.uid()
                or (s.organization_id is not null and public.has_org_role(s.organization_id, array['owner','admin','manager','facility']::public.member_role[]))))
    or public.is_platform_admin()
  );
drop policy if exists parking_bookings_user_insert on public.parking_bookings;
create policy parking_bookings_user_insert on public.parking_bookings
  for insert to authenticated with check (user_id=auth.uid());
drop policy if exists parking_bookings_update on public.parking_bookings;
create policy parking_bookings_update on public.parking_bookings
  for update to authenticated using (
    user_id=auth.uid()
    or exists(select 1 from public.parking_spots s where s.id=parking_spot_id and s.owner_user_id=auth.uid())
    or public.is_platform_admin()
  );

-- ============================================================
-- RPC MÉTIER
-- ============================================================

-- Publie une borne (ressource + table spécialisée en une transaction).
create or replace function public.create_charging_station(
  p_name text,
  p_address text default null,
  p_connector_type text default null,
  p_power_kw numeric default null,
  p_price_cents_per_kwh int default 0,
  p_price_cents_per_hour int default 0,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_visibility public.visibility_level default 'public',
  p_lng double precision default null,
  p_lat double precision default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_resource_id uuid; v_station_id uuid; v_loc geography(Point,4326);
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;
  if coalesce(trim(p_name),'')='' then raise exception 'Nom de la borne obligatoire.'; end if;
  if p_organization_id is not null
     and not public.has_org_role(p_organization_id, array['owner','admin','manager','facility']::public.member_role[]) then
    raise exception 'Action non autorisée pour cette organisation.';
  end if;
  if p_lng is not null and p_lat is not null then
    v_loc := ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography;
  end if;

  insert into public.mobility_resources(owner_user_id, organization_id, resource_type, title, visibility, address, location, suggested_price_cents, is_active)
  values (v_me, p_organization_id, 'charging_station', trim(p_name), p_visibility, p_address, v_loc, coalesce(p_price_cents_per_kwh,0), true)
  returning id into v_resource_id;

  insert into public.charging_stations(resource_id, owner_user_id, organization_id, site_id, name, address, location, connector_type, power_kw, suggested_price_cents_per_kwh, suggested_price_cents_per_hour, visibility, is_active)
  values (v_resource_id, v_me, p_organization_id, p_site_id, trim(p_name), p_address, v_loc, p_connector_type, p_power_kw, coalesce(p_price_cents_per_kwh,0), coalesce(p_price_cents_per_hour,0), p_visibility, true)
  returning id into v_station_id;

  return v_station_id;
end; $$;

-- Publie une place de parking / garage.
create or replace function public.create_parking_spot(
  p_title text,
  p_address text default null,
  p_spot_type text default 'standard',
  p_max_height_cm int default null,
  p_price_cents_per_hour int default 0,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_visibility public.visibility_level default 'public',
  p_lng double precision default null,
  p_lat double precision default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_resource_id uuid; v_spot_id uuid; v_loc geography(Point,4326);
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;
  if coalesce(trim(p_title),'')='' then raise exception 'Intitulé de la place obligatoire.'; end if;
  if p_organization_id is not null
     and not public.has_org_role(p_organization_id, array['owner','admin','manager','facility']::public.member_role[]) then
    raise exception 'Action non autorisée pour cette organisation.';
  end if;
  if p_lng is not null and p_lat is not null then
    v_loc := ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography;
  end if;

  insert into public.mobility_resources(owner_user_id, organization_id, resource_type, title, visibility, address, location, suggested_price_cents, is_active)
  values (v_me, p_organization_id, 'parking_spot', trim(p_title), p_visibility, p_address, v_loc, coalesce(p_price_cents_per_hour,0), true)
  returning id into v_resource_id;

  insert into public.parking_spots(resource_id, owner_user_id, organization_id, site_id, title, address, location, spot_type, max_height_cm, suggested_price_cents_per_hour, visibility, is_active)
  values (v_resource_id, v_me, p_organization_id, p_site_id, trim(p_title), p_address, v_loc, coalesce(p_spot_type,'standard'), p_max_height_cm, coalesce(p_price_cents_per_hour,0), p_visibility, true)
  returning id into v_spot_id;

  return v_spot_id;
end; $$;

-- Réserver un créneau de borne (l'anti-chevauchement est appliqué par trigger).
create or replace function public.book_charging_slot(p_station_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_vehicle_label text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_station record; v_id uuid;
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;
  if p_ends_at <= p_starts_at then raise exception 'Créneau invalide.'; end if;
  select * into v_station from public.charging_stations where id = p_station_id and is_active;
  if not found then raise exception 'Borne introuvable ou inactive.'; end if;
  insert into public.charging_bookings(station_id, user_id, vehicle_label, starts_at, ends_at, status, expected_direct_payment_cents)
  values (p_station_id, v_me, p_vehicle_label, p_starts_at, p_ends_at, 'pending',
    coalesce(v_station.suggested_price_cents_per_hour,0) * ceil(extract(epoch from (p_ends_at - p_starts_at))/3600)::int)
  returning id into v_id;
  return v_id;
end; $$;

-- Réserver un créneau de parking.
create or replace function public.book_parking_slot(p_spot_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_plate_hash text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_spot record; v_id uuid;
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;
  if p_ends_at <= p_starts_at then raise exception 'Créneau invalide.'; end if;
  select * into v_spot from public.parking_spots where id = p_spot_id and is_active;
  if not found then raise exception 'Place introuvable ou inactive.'; end if;
  insert into public.parking_bookings(parking_spot_id, user_id, vehicle_plate_hash, starts_at, ends_at, status, expected_direct_payment_cents)
  values (p_spot_id, v_me, p_plate_hash, p_starts_at, p_ends_at, 'pending',
    coalesce(v_spot.suggested_price_cents_per_hour,0) * ceil(extract(epoch from (p_ends_at - p_starts_at))/3600)::int)
  returning id into v_id;
  return v_id;
end; $$;

grant execute on function public.create_charging_station(text,text,text,numeric,int,int,uuid,uuid,public.visibility_level,double precision,double precision) to authenticated;
grant execute on function public.create_parking_spot(text,text,text,int,int,uuid,uuid,public.visibility_level,double precision,double precision) to authenticated;
grant execute on function public.book_charging_slot(uuid,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.book_parking_slot(uuid,timestamptz,timestamptz,text) to authenticated;
