-- ============================================================
-- 0003 — Organisations, sites, membres, invitations
-- Socle B2B (entreprises, collectivités, commerces…) + RBAC.
-- ============================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  org_type public.org_type not null,
  name text not null,
  slug text unique,
  siret text,
  vat_number text,
  website text,
  description text,
  verified boolean not null default false,
  owner_user_id uuid references public.profiles(id),
  billing_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  city text,
  postal_code text,
  country text default 'FR',
  location geography(Point,4326),
  parking_capacity int,
  charging_capacity int,
  employee_capacity int,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  job_title text,
  payroll_identifier text,
  site_id uuid references public.organization_sites(id),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique(organization_id, user_id)
);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'member',
  token text unique not null default encode(gen_random_bytes(24),'hex'),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

drop trigger if exists trg_org_touch on public.organizations;
create trigger trg_org_touch before update on public.organizations
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- Helpers RBAC (SECURITY DEFINER → pas de récursion RLS)
-- ------------------------------------------------------------
create or replace function public.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.has_org_role(org uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
      and m.role = any(roles) and m.status = 'active'
  );
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.organizations enable row level security;
alter table public.organization_sites enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;

-- Organisations : visibles si vérifiées, ou pour le propriétaire/membre/admin.
drop policy if exists org_read on public.organizations;
create policy org_read on public.organizations
  for select to authenticated using (
    verified = true or owner_user_id = auth.uid()
    or public.is_org_member(id) or public.is_platform_admin()
  );
drop policy if exists org_insert_owner on public.organizations;
create policy org_insert_owner on public.organizations
  for insert to authenticated with check (owner_user_id = auth.uid());
drop policy if exists org_update_admin on public.organizations;
create policy org_update_admin on public.organizations
  for update to authenticated using (
    owner_user_id = auth.uid()
    or public.has_org_role(id, array['owner','admin']::public.member_role[])
    or public.is_platform_admin()
  );

-- Sites : lecture par les membres ; écriture par les rôles de gestion.
drop policy if exists org_sites_member_read on public.organization_sites;
create policy org_sites_member_read on public.organization_sites
  for select to authenticated using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists org_sites_admin_write on public.organization_sites;
create policy org_sites_admin_write on public.organization_sites
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','manager','facility']::public.member_role[]) or public.is_platform_admin())
  with check (public.has_org_role(organization_id, array['owner','admin','manager','facility']::public.member_role[]) or public.is_platform_admin());

-- Membres : on voit les membres de ses organisations ; gestion par owner/admin.
drop policy if exists org_members_read on public.organization_members;
create policy org_members_read on public.organization_members
  for select to authenticated using (
    user_id = auth.uid() or public.is_org_member(organization_id) or public.is_platform_admin()
  );
drop policy if exists org_members_admin_write on public.organization_members;
create policy org_members_admin_write on public.organization_members
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]) or public.is_platform_admin())
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]) or public.is_platform_admin());

-- Invitations : gérées par owner/admin de l'organisation.
drop policy if exists org_invitations_admin on public.organization_invitations;
create policy org_invitations_admin on public.organization_invitations
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]) or public.is_platform_admin())
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]) or public.is_platform_admin());
