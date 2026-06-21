-- ============================================================
-- 0013 — rides.vehicle_info + extension de create_ride
-- Conserve l'info véhicule libre (comme en v4) sur le trajet.
-- ============================================================

alter table public.rides add column if not exists vehicle_info text;

-- On remplace create_ride (ajout du paramètre p_vehicle_info en fin de signature).
drop function if exists public.create_ride(text,text,timestamptz,int,int,uuid,uuid,uuid,public.visibility_level,numeric,text,int,double precision,double precision,double precision,double precision);

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
  p_dest_lat double precision default null,
  p_vehicle_info text default null
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
    visibility, location, suggested_price_cents, payment_mode, is_active, metadata)
  values (
    v_me, p_organization_id, p_community_id, 'ride',
    p_origin_label || ' → ' || p_destination_label,
    p_visibility, v_origin, coalesce(p_price_cents,0), 'outside_tapgoo', true,
    case when p_vehicle_info is not null then jsonb_build_object('vehicle_info', p_vehicle_info) else '{}'::jsonb end)
  returning id into v_resource_id;

  insert into public.rides(
    resource_id, driver_id, vehicle_id, organization_id, community_id,
    origin_label, destination_label, origin, destination, departure_time,
    recurrence_rule, seats_total, seats_available, detour_minutes_max,
    distance_km, suggested_price_cents, vehicle_info, status)
  values (
    v_resource_id, v_me, p_vehicle_id, p_organization_id, p_community_id,
    trim(p_origin_label), trim(p_destination_label), v_origin, v_dest, p_departure_time,
    p_recurrence_rule, p_seats_total, p_seats_total, coalesce(p_detour_minutes_max,10),
    p_distance_km, coalesce(p_price_cents,0), p_vehicle_info, 'published')
  returning id into v_ride_id;

  return v_ride_id;
end; $$;

grant execute on function public.create_ride(text,text,timestamptz,int,int,uuid,uuid,uuid,public.visibility_level,numeric,text,int,double precision,double precision,double precision,double precision,text) to authenticated;
