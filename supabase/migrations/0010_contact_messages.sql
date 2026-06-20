-- ============================================================
-- 0010 — contact_messages (réintroduit depuis v4)
-- Alimente /api/contact (page Entreprises). Écriture via service_role
-- (côté serveur) ; lecture réservée à l'admin plateforme.
-- ============================================================

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text not null,
  entreprise text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Pas de policy d'insert pour anon/authenticated → la RLS bloque toute écriture
-- côté client. Seul le service_role (qui contourne la RLS) insère via l'API.
-- Lecture réservée à l'admin plateforme.
drop policy if exists contact_messages_admin_read on public.contact_messages;
create policy contact_messages_admin_read on public.contact_messages
  for select to authenticated using (public.is_platform_admin());
