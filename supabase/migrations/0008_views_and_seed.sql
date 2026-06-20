-- ============================================================
-- 0008 — Index, vues dashboard, seed facteurs d'émission
-- ============================================================

-- ------------------------------------------------------------
-- Index (recherches géospatiales, réservations, dashboards)
-- ------------------------------------------------------------
create index if not exists idx_user_addresses_user on public.user_addresses(user_id);
create index if not exists idx_user_addresses_geo on public.user_addresses using gist(location);
create index if not exists idx_org_sites_org on public.organization_sites(organization_id);
create index if not exists idx_org_sites_geo on public.organization_sites using gist(location);
create index if not exists idx_org_members_user on public.organization_members(user_id);
create index if not exists idx_community_members_user on public.community_members(user_id);
create index if not exists idx_resources_geo on public.mobility_resources using gist(location);
create index if not exists idx_resources_type_active on public.mobility_resources(resource_type, is_active);
create index if not exists idx_rides_driver on public.rides(driver_id);
create index if not exists idx_rides_departure on public.rides(departure_time);
create index if not exists idx_rides_origin_geo on public.rides using gist(origin);
create index if not exists idx_rides_destination_geo on public.rides using gist(destination);
create index if not exists idx_ride_bookings_passenger on public.ride_bookings(passenger_id);
create index if not exists idx_ride_bookings_ride on public.ride_bookings(ride_id);
create index if not exists idx_charging_bookings_time on public.charging_bookings(station_id, starts_at, ends_at);
create index if not exists idx_parking_bookings_time on public.parking_bookings(parking_spot_id, starts_at, ends_at);
create index if not exists idx_carbon_events_org_date on public.carbon_events(organization_id, event_date);
create index if not exists idx_mobility_proofs_user on public.mobility_proofs(user_id, status);
create index if not exists idx_audit_actor on public.audit_logs(actor_id, created_at);

-- ------------------------------------------------------------
-- Vues dashboard (security_invoker = on → respectent la RLS de l'appelant :
-- chacun ne voit que ses propres lignes / celles de ses organisations)
-- ------------------------------------------------------------
create or replace view public.v_user_mobility_summary
  with (security_invoker = on) as
select p.id as user_id,
  count(distinct rb.id) filter (where rb.status='completed') as completed_rides_as_passenger,
  count(distinct r.id)  filter (where r.status='completed')  as completed_rides_as_driver,
  coalesce(sum(ce.avoided_kgco2e),0) as avoided_kgco2e,
  coalesce(sum(mp.amount_cents) filter (where mp.status='approved'),0) as fmd_approved_amount_cents
from public.profiles p
left join public.ride_bookings rb on rb.passenger_id = p.id
left join public.rides r on r.driver_id = p.id
left join public.carbon_events ce on ce.user_id = p.id
left join public.mobility_proofs mp on mp.user_id = p.id
group by p.id;

create or replace view public.v_organization_mobility_dashboard
  with (security_invoker = on) as
select o.id as organization_id,
  count(distinct om.user_id) as members,
  count(distinct r.id) as rides,
  count(distinct cs.id) as charging_stations,
  count(distinct ps.id) as parking_spots,
  coalesce(sum(ce.avoided_kgco2e),0) as avoided_kgco2e
from public.organizations o
left join public.organization_members om on om.organization_id = o.id
left join public.rides r on r.organization_id = o.id
left join public.charging_stations cs on cs.organization_id = o.id
left join public.parking_spots ps on ps.organization_id = o.id
left join public.carbon_events ce on ce.organization_id = o.id
group by o.id;

-- ------------------------------------------------------------
-- Seed : facteurs d'émission (exemples ADEME Base Empreinte, à compléter).
-- Source à vérifier/mettre à jour : https://base-empreinte.ademe.fr/
-- ------------------------------------------------------------
insert into public.emission_factors
  (source_name, source_version, factor_key, mode, vehicle_energy, unit, kgco2e_per_unit, uncertainty_percent, valid_from, url, notes)
values
  ('ADEME Base Empreinte','2024','car_passenger_avg','carpool','thermal','kgco2e/p.km',0.218, 20, date '2024-01-01',
   'https://base-empreinte.ademe.fr/','Valeur indicative voiture thermique moyenne — à confirmer avec la version officielle.'),
  ('ADEME Base Empreinte','2024','car_passenger_ev','carpool','electric','kgco2e/p.km',0.103, 25, date '2024-01-01',
   'https://base-empreinte.ademe.fr/','Valeur indicative véhicule électrique — à confirmer.')
on conflict (source_name, source_version, factor_key, valid_from) do nothing;
