-- ============================================================
-- 06 — ride_bookings → ride_bookings (workflow OS)
-- 'confirmed' (v4) → 'accepted' (OS). seats_available a déjà été repris verbatim
-- en 05 : on NE redécrémente PAS.
-- ============================================================
insert into public.ride_bookings
  (id, ride_id, passenger_id, status, seats, expected_direct_payment_cents, created_at)
select b.id, b.ride_id, b.passenger_id,
       (case b.status when 'confirmed' then 'accepted'
                      when 'pending' then 'pending'
                      when 'cancelled' then 'cancelled'
                      else 'pending' end)::public.booking_status,
       greatest(coalesce(b.seats_booked,1),1),
       coalesce((select r.price_cents from legacy.rides r where r.id = b.ride_id),0) * greatest(coalesce(b.seats_booked,1),1),
       coalesce(b.created_at, now())
from legacy.ride_bookings b
on conflict (id) do nothing;
