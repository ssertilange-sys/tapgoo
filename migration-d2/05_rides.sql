-- ============================================================
-- 05 — rides → mobility_resources + rides
-- Astuce : on réutilise l'id du trajet v4 comme id de la ressource (tables
-- distinctes → pas de collision) ; resource_id = id du trajet.
-- ============================================================
insert into public.mobility_resources
  (id, owner_user_id, resource_type, title, visibility, suggested_price_cents, payment_mode, is_active, metadata, created_at)
select l.id, l.driver_id, 'ride', l.origin || ' → ' || l.destination, 'public',
       coalesce(l.price_cents,0), 'outside_tapgoo', (l.status <> 'cancelled'),
       case when l.vehicle_info is not null then jsonb_build_object('vehicle_info', l.vehicle_info) else '{}'::jsonb end,
       coalesce(l.created_at, now())
from legacy.rides l
on conflict (id) do nothing;

insert into public.rides
  (id, resource_id, driver_id, origin_label, destination_label, departure_time,
   seats_total, seats_available, suggested_price_cents, vehicle_info, distance_km, status, created_at)
select l.id, l.id, l.driver_id, l.origin, l.destination, l.departure_time,
       greatest(coalesce(l.seats_total,1),1), greatest(coalesce(l.seats_available,0),0),
       coalesce(l.price_cents,0), l.vehicle_info, l.distance_km,
       (case l.status when 'active' then 'published'
                      when 'cancelled' then 'cancelled'
                      when 'completed' then 'completed'
                      else 'published' end),
       coalesce(l.created_at, now())
from legacy.rides l
on conflict (id) do nothing;
