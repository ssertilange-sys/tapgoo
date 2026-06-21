-- ============================================================
-- 09 — contact_messages (reprise directe)
-- company_requests / station_reports : pas d'équivalent OS → restent archivés
-- dans le schéma legacy (consultables, non migrés).
-- ============================================================
insert into public.contact_messages (id, nom, email, entreprise, message, created_at)
select c.id, c.nom, c.email, c.entreprise, c.message, coalesce(c.created_at, now())
from legacy.contact_messages c
on conflict (id) do nothing;
