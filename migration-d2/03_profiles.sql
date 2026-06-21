-- ============================================================
-- 03 — profiles → profiles (public) + user_private_profiles + user_vehicles
-- Pré-requis : auth.users restaurée (étape 2) → profils squelettes créés par
-- le trigger handle_new_user. On les met à jour ici.
-- ============================================================

-- Filet : créer le profil si le trigger ne l'a pas fait (display_name NOT NULL).
insert into public.profiles (id, display_name)
select l.id, coalesce(nullif(trim(l.full_name),''), 'Membre TAPGOO')
from legacy.profiles l
on conflict (id) do nothing;

insert into public.user_private_profiles (user_id)
select l.id from legacy.profiles l
on conflict (user_id) do nothing;

-- Champs publics
update public.profiles p set
  display_name = coalesce(nullif(trim(l.full_name),''), p.display_name),
  avatar_url   = coalesce(l.avatar_url, p.avatar_url),
  default_city = l.city,
  account_type = (case l.main_role
                    when 'company' then 'professional'
                    when 'admin'   then 'platform_admin'
                    else 'citizen' end)::public.account_type
from legacy.profiles l
where l.id = p.id;

-- Téléphone (privé)
update public.user_private_profiles up set phone = l.phone
from legacy.profiles l
where l.id = up.user_id and coalesce(trim(l.phone),'') <> '';

-- Véhicule par défaut
insert into public.user_vehicles (user_id, label, is_default)
select l.id, trim(l.vehicle), true
from legacy.profiles l
where coalesce(trim(l.vehicle),'') <> ''
  and not exists (select 1 from public.user_vehicles v where v.user_id = l.id and v.is_default);
