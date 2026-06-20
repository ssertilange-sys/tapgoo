-- ============================================================
-- 0004 — Communautés de confiance
-- Cercles locaux (quartier, village, campus, entreprise, association).
-- ============================================================

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  visibility public.visibility_level not null default 'public',
  city text,
  location geography(Point,4326),
  radius_m int,
  rules text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  unique(community_id, user_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  title text,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- Helper d'appartenance (SECURITY DEFINER → pas de récursion RLS).
create or replace function public.is_community_member(comm uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.community_members cm
    where cm.community_id = comm and cm.user_id = auth.uid() and cm.status = 'active'
  );
$$;

-- Rôle de modération dans une communauté.
create or replace function public.is_community_moderator(comm uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.community_members cm
    where cm.community_id = comm and cm.user_id = auth.uid()
      and cm.status = 'active' and cm.role = any(array['owner','admin','moderator']::public.member_role[])
  );
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;

-- Communautés : publiques visibles par tous ; sinon créateur/membre/membre de l'org.
drop policy if exists communities_read_scope on public.communities;
create policy communities_read_scope on public.communities
  for select to authenticated using (
    visibility = 'public' or created_by = auth.uid() or public.is_community_member(id)
    or (organization_id is not null and public.is_org_member(organization_id))
    or public.is_platform_admin()
  );
drop policy if exists communities_insert on public.communities;
create policy communities_insert on public.communities
  for insert to authenticated with check (
    created_by = auth.uid()
    or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]))
    or public.is_platform_admin()
  );
drop policy if exists communities_update on public.communities;
create policy communities_update on public.communities
  for update to authenticated using (
    created_by = auth.uid() or public.is_community_moderator(id) or public.is_platform_admin()
  );

-- Membres : lecture par les membres ; on peut rejoindre soi-même une communauté
-- publique ; la gestion (rôles, exclusions) revient aux modérateurs.
drop policy if exists community_members_read on public.community_members;
create policy community_members_read on public.community_members
  for select to authenticated using (
    user_id = auth.uid() or public.is_community_member(community_id) or public.is_platform_admin()
  );
drop policy if exists community_members_self_join on public.community_members;
create policy community_members_self_join on public.community_members
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.communities c where c.id = community_id and c.visibility = 'public')
  );
drop policy if exists community_members_self_leave on public.community_members;
create policy community_members_self_leave on public.community_members
  for delete to authenticated using (user_id = auth.uid() or public.is_community_moderator(community_id));
drop policy if exists community_members_moderate on public.community_members;
create policy community_members_moderate on public.community_members
  for update to authenticated using (public.is_community_moderator(community_id) or public.is_platform_admin());

-- Posts : lecture par les membres (ou si communauté publique) ; écriture par les
-- membres ; modération/épinglage par les modérateurs.
drop policy if exists community_posts_read on public.community_posts;
create policy community_posts_read on public.community_posts
  for select to authenticated using (
    public.is_community_member(community_id)
    or exists (select 1 from public.communities c where c.id = community_id and c.visibility = 'public')
    or public.is_platform_admin()
  );
drop policy if exists community_posts_insert on public.community_posts;
create policy community_posts_insert on public.community_posts
  for insert to authenticated with check (
    author_id = auth.uid() and public.is_community_member(community_id)
  );
drop policy if exists community_posts_moderate on public.community_posts;
create policy community_posts_moderate on public.community_posts
  for update to authenticated using (author_id = auth.uid() or public.is_community_moderator(community_id));
drop policy if exists community_posts_delete on public.community_posts;
create policy community_posts_delete on public.community_posts
  for delete to authenticated using (author_id = auth.uid() or public.is_community_moderator(community_id));
