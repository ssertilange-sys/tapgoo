-- ============================================================
-- 50 — Vérification post-migration : comptages legacy vs OS + orphelins
-- ============================================================
select 'profiles'      as entite, (select count(*) from legacy.profiles)            as v4, (select count(*) from public.profiles)            as os
union all select 'rides',          (select count(*) from legacy.rides),              (select count(*) from public.rides)
union all select 'ride_bookings',  (select count(*) from legacy.ride_bookings),      (select count(*) from public.ride_bookings)
union all select 'charging',       (select count(*) from legacy.charging_stations),  (select count(*) from public.charging_stations)
union all select 'messages',       (select count(*) from legacy.messages),           (select count(*) from public.messages)
union all select 'organizations',  (select count(*) from legacy.companies),          (select count(*) from public.organizations)
union all select 'contact',        (select count(*) from legacy.contact_messages),   (select count(*) from public.contact_messages);

-- Intégrité : chaque trajet pointe vers une ressource existante (doit être 0)
select 'rides_sans_ressource' as probleme, count(*) from public.rides r
  where not exists (select 1 from public.mobility_resources mr where mr.id = r.resource_id);
-- Réservations orphelines (doit être 0)
select 'bookings_orphelins' as probleme, count(*) from public.ride_bookings b
  where not exists (select 1 from public.rides r where r.id = b.ride_id);
-- Membres d'org sans profil (doit être 0)
select 'membres_sans_profil' as probleme, count(*) from public.organization_members m
  where not exists (select 1 from public.profiles p where p.id = m.user_id);
