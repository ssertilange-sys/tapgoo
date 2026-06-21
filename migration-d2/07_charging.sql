-- ============================================================
-- 07 — charging_stations → mobility_resources + charging_stations ; bookings
-- city repliée dans address (pas de colonne city en OS).
-- Si le trigger anti-chevauchement bloque des bookings historiques, le
-- désactiver le temps du load (voir README).
-- ============================================================
insert into public.mobility_resources
  (id, owner_user_id, resource_type, title, visibility, address, suggested_price_cents, payment_mode, is_active, created_at)
select s.id, s.owner_id, 'charging_station', s.name, 'public',
       nullif(concat_ws(', ', nullif(trim(s.address),''), nullif(trim(s.city),'')), ''),
       coalesce(s.price_cents_per_kwh,0), 'outside_tapgoo', (s.status = 'available'),
       coalesce(s.created_at, now())
from legacy.charging_stations s
on conflict (id) do nothing;

insert into public.charging_stations
  (id, resource_id, owner_user_id, name, address, connector_type, power_kw, suggested_price_cents_per_kwh, visibility, is_active, created_at)
select s.id, s.id, s.owner_id, s.name,
       nullif(concat_ws(', ', nullif(trim(s.address),''), nullif(trim(s.city),'')), ''),
       s.plug_type, s.power_kw, coalesce(s.price_cents_per_kwh,0), 'public', (s.status = 'available'),
       coalesce(s.created_at, now())
from legacy.charging_stations s
on conflict (id) do nothing;

insert into public.charging_bookings
  (id, station_id, user_id, starts_at, ends_at, status, created_at)
select b.id, b.station_id, b.user_id, b.starts_at, b.ends_at,
       (case b.status when 'confirmed' then 'accepted'
                      when 'pending' then 'pending'
                      when 'cancelled' then 'cancelled'
                      when 'completed' then 'completed'
                      else 'pending' end)::public.booking_status,
       coalesce(b.created_at, now())
from legacy.charging_bookings b
on conflict (id) do nothing;
