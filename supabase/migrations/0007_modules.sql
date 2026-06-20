-- ============================================================
-- 0007 — Modules métier
-- Solidarité, FMD/paie, carbone/ESG, business, gamification,
-- reviews/incidents, messagerie. RLS complète + génération de preuve FMD.
-- ============================================================

-- =========================
-- SOLIDARITÉ (données sensibles)
-- =========================
create table if not exists public.solidarity_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id),
  beneficiary_alias text,
  origin_label text,
  destination_label text,
  requested_at timestamptz,
  need_description text,
  sensitive_context boolean not null default true,
  status text not null default 'open',
  created_at timestamptz default now()
);
create table if not exists public.solidarity_assignments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.solidarity_requests(id) on delete cascade,
  volunteer_id uuid not null references public.profiles(id),
  status public.booking_status not null default 'pending',
  created_at timestamptz default now()
);

-- =========================
-- FMD / PAIE / RH
-- =========================
create table if not exists public.fmd_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  year int not null,
  annual_cap_cents int not null,
  eligible_modes text[] not null default array['carpool','bike','public_transport_other'],
  requires_receipt boolean not null default true,
  created_at timestamptz default now(),
  unique(organization_id, year)
);
create table if not exists public.mobility_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  organization_id uuid references public.organizations(id),
  source_table text not null,
  source_id uuid not null,
  proof_type text not null,
  proof_date date not null,
  distance_km numeric(8,2),
  amount_cents int default 0,
  status text not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(source_table, source_id, user_id)
);
create table if not exists public.payroll_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  provider text not null,
  file_url text,
  status text not null default 'draft',
  generated_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- =========================
-- CARBONE / ESG
-- =========================
create table if not exists public.emission_factors (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_version text not null,
  factor_key text not null,
  mode text not null,
  vehicle_energy text,
  unit text not null,
  kgco2e_per_unit numeric(12,6) not null,
  uncertainty_percent numeric(6,2),
  valid_from date not null,
  valid_to date,
  url text,
  notes text,
  created_at timestamptz default now(),
  unique(source_name, source_version, factor_key, valid_from)
);
create table if not exists public.carbon_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id),
  community_id uuid references public.communities(id),
  source_table text not null,
  source_id uuid not null,
  event_date date not null,
  baseline_kgco2e numeric(12,4) not null default 0,
  actual_kgco2e numeric(12,4) not null default 0,
  avoided_kgco2e numeric(12,4) generated always as (greatest(baseline_kgco2e - actual_kgco2e,0)) stored,
  methodology text not null,
  factor_ids uuid[] not null default '{}',
  calculation_details jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
create table if not exists public.esg_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  community_id uuid references public.communities(id),
  report_type text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft',
  generated_by uuid references public.profiles(id),
  file_url text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- =========================
-- BUSINESS / GAMIFICATION
-- =========================
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  target text not null,
  price_cents_monthly int not null default 0,
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz default now()
);
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id),
  user_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id),
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  external_provider text,
  external_subscription_id text,
  created_at timestamptz default now(),
  constraint subscription_owner_check check (user_id is not null or organization_id is not null)
);
create table if not exists public.benefit_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  community_id uuid references public.communities(id),
  name text not null,
  budget_cents int default 0,
  rules jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now()
);
create table if not exists public.benefit_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  program_id uuid references public.benefit_programs(id),
  points int not null,
  reason text not null,
  source_table text,
  source_id uuid,
  created_at timestamptz default now()
);
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  community_id uuid references public.communities(id),
  title text not null,
  description text,
  metric text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now()
);

-- =========================
-- REVIEWS / INCIDENTS
-- =========================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(id),
  reviewed_user_id uuid references public.profiles(id),
  reviewed_resource_id uuid references public.mobility_resources(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id),
  source_table text,
  source_id uuid,
  severity text not null default 'normal',
  status text not null default 'open',
  description text not null,
  assigned_to uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================
-- MESSAGERIE (absente du master schema)
-- =========================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid references public.rides(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);

-- Helper anti-récursion pour la messagerie.
create or replace function public.is_conversation_member(conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.conversation_members m
                where m.conversation_id = conv and m.user_id = auth.uid());
$$;

-- ============================================================
-- GÉNÉRATION AUTOMATIQUE DE PREUVE FMD (à la double-validation)
-- ============================================================
create or replace function public.on_ride_booking_completed()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_dist numeric;
begin
  if new.status = 'completed' and new.fmd_eligible
     and (old.status is distinct from 'completed') then
    select organization_id, distance_km into v_org, v_dist from public.rides where id = new.ride_id;
    insert into public.mobility_proofs(user_id, organization_id, source_table, source_id, proof_type, proof_date, distance_km, status)
    values (new.passenger_id, v_org, 'ride_bookings', new.id, 'carpool', current_date, v_dist, 'pending')
    on conflict (source_table, source_id, user_id) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists trg_ride_booking_completed on public.ride_bookings;
create trigger trg_ride_booking_completed after update on public.ride_bookings
  for each row execute function public.on_ride_booking_completed();

-- ============================================================
-- CARBONE : crée un événement d'évitement pour une réservation
-- (méthode prudente : évitement attribué au passager — cf. dossier §10.1)
-- ============================================================
create or replace function public.create_carbon_event_for_ride_booking(p_booking_id uuid, p_factor_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare b record; factor numeric; baseline numeric; event_id uuid;
begin
  select rb.passenger_id, rb.seats, r.distance_km, r.organization_id, r.community_id
    into b
  from public.ride_bookings rb join public.rides r on r.id = rb.ride_id
  where rb.id = p_booking_id;
  if not found then raise exception 'Réservation introuvable.'; end if;

  select kgco2e_per_unit into factor from public.emission_factors where id = p_factor_id;
  if factor is null then raise exception 'Facteur d''émission introuvable.'; end if;

  baseline := coalesce(b.distance_km,0) * factor * b.seats;

  insert into public.carbon_events(user_id, organization_id, community_id, source_table, source_id, event_date,
    baseline_kgco2e, actual_kgco2e, methodology, factor_ids, calculation_details)
  values (b.passenger_id, b.organization_id, b.community_id, 'ride_bookings', p_booking_id, current_date,
    baseline, 0, 'TAPGOO_CARPOOL_AVOIDED_V1_PASSENGER_ONLY', array[p_factor_id],
    jsonb_build_object('distance_km', b.distance_km, 'seats', b.seats, 'factor', factor))
  returning id into event_id;
  return event_id;
end; $$;

-- ============================================================
-- MESSAGERIE : démarrer / lister une conversation
-- ============================================================
create or replace function public.start_conversation(p_other_user uuid, p_ride_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_conv uuid;
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;
  if p_other_user is null or p_other_user = v_me then raise exception 'Destinataire invalide.'; end if;
  if not exists (select 1 from public.profiles where id = p_other_user) then raise exception 'Membre introuvable.'; end if;

  select c.id into v_conv from public.conversations c
  join public.conversation_members a on a.conversation_id = c.id and a.user_id = v_me
  join public.conversation_members b on b.conversation_id = c.id and b.user_id = p_other_user
  limit 1;

  if v_conv is null then
    insert into public.conversations (ride_id) values (p_ride_id) returning id into v_conv;
    insert into public.conversation_members (conversation_id, user_id) values (v_conv, v_me), (v_conv, p_other_user);
  end if;
  return v_conv;
end; $$;

create or replace function public.list_conversations()
returns table (conversation_id uuid, other_name text, other_avatar text, last_body text, last_at timestamptz)
language sql security definer set search_path = public as $$
  select c.id, p.display_name, p.avatar_url, lm.body, lm.created_at
  from public.conversations c
  join public.conversation_members me on me.conversation_id = c.id and me.user_id = auth.uid()
  join public.conversation_members other on other.conversation_id = c.id and other.user_id <> auth.uid()
  join public.profiles p on p.id = other.user_id
  left join lateral (
    select body, created_at from public.messages m
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.solidarity_requests enable row level security;
alter table public.solidarity_assignments enable row level security;
alter table public.fmd_policies enable row level security;
alter table public.mobility_proofs enable row level security;
alter table public.payroll_exports enable row level security;
alter table public.emission_factors enable row level security;
alter table public.carbon_events enable row level security;
alter table public.esg_reports enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.benefit_programs enable row level security;
alter table public.benefit_points enable row level security;
alter table public.challenges enable row level security;
alter table public.reviews enable row level security;
alter table public.incidents enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Solidarité (sensible) : demandeur, encadrants de l'organisation, bénévole assigné.
drop policy if exists solidarity_req_read on public.solidarity_requests;
create policy solidarity_req_read on public.solidarity_requests for select to authenticated using (
  requester_id = auth.uid()
  or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','support']::public.member_role[]))
  or exists(select 1 from public.solidarity_assignments a where a.request_id = id and a.volunteer_id = auth.uid())
  or public.is_platform_admin()
);
drop policy if exists solidarity_req_write on public.solidarity_requests;
create policy solidarity_req_write on public.solidarity_requests for all to authenticated
  using (requester_id = auth.uid() or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','support']::public.member_role[])) or public.is_platform_admin())
  with check (requester_id = auth.uid() or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','support']::public.member_role[])) or public.is_platform_admin());
drop policy if exists solidarity_assign_read on public.solidarity_assignments;
create policy solidarity_assign_read on public.solidarity_assignments for select to authenticated using (
  volunteer_id = auth.uid()
  or exists(select 1 from public.solidarity_requests r where r.id = request_id and (r.requester_id = auth.uid() or (r.organization_id is not null and public.has_org_role(r.organization_id, array['owner','admin','manager','support']::public.member_role[]))))
  or public.is_platform_admin()
);
drop policy if exists solidarity_assign_write on public.solidarity_assignments;
create policy solidarity_assign_write on public.solidarity_assignments for all to authenticated
  using (volunteer_id = auth.uid() or exists(select 1 from public.solidarity_requests r where r.id = request_id and r.organization_id is not null and public.has_org_role(r.organization_id, array['owner','admin','manager','support']::public.member_role[])) or public.is_platform_admin())
  with check (volunteer_id = auth.uid() or exists(select 1 from public.solidarity_requests r where r.id = request_id and r.organization_id is not null and public.has_org_role(r.organization_id, array['owner','admin','manager','support']::public.member_role[])) or public.is_platform_admin());

-- FMD : politiques visibles par les membres, écrites par les gestionnaires.
drop policy if exists fmd_policies_read on public.fmd_policies;
create policy fmd_policies_read on public.fmd_policies for select to authenticated using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists fmd_policies_write on public.fmd_policies;
create policy fmd_policies_write on public.fmd_policies for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','rse','finance']::public.member_role[]) or public.is_platform_admin())
  with check (public.has_org_role(organization_id, array['owner','admin','rse','finance']::public.member_role[]) or public.is_platform_admin());

-- Preuves : le salarié voit les siennes, les gestionnaires paie celles de l'org.
drop policy if exists proofs_read on public.mobility_proofs;
create policy proofs_read on public.mobility_proofs for select to authenticated using (
  user_id = auth.uid()
  or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','payroll','rse']::public.member_role[]))
  or public.is_platform_admin()
);
drop policy if exists proofs_user_insert on public.mobility_proofs;
create policy proofs_user_insert on public.mobility_proofs for insert to authenticated with check (user_id = auth.uid());
drop policy if exists proofs_staff_update on public.mobility_proofs;
create policy proofs_staff_update on public.mobility_proofs for update to authenticated using (
  (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','payroll']::public.member_role[])) or public.is_platform_admin()
);
drop policy if exists payroll_exports_staff on public.payroll_exports;
create policy payroll_exports_staff on public.payroll_exports for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','payroll','finance']::public.member_role[]) or public.is_platform_admin())
  with check (public.has_org_role(organization_id, array['owner','admin','payroll','finance']::public.member_role[]) or public.is_platform_admin());

-- Carbone : facteurs publics, événements scopés (insert via fonction definer).
drop policy if exists emission_factors_read on public.emission_factors;
create policy emission_factors_read on public.emission_factors for select using (true);
drop policy if exists carbon_read on public.carbon_events;
create policy carbon_read on public.carbon_events for select to authenticated using (
  user_id = auth.uid()
  or (organization_id is not null and public.is_org_member(organization_id))
  or (community_id is not null and public.is_community_member(community_id))
  or public.is_platform_admin()
);
drop policy if exists esg_reports_staff on public.esg_reports;
create policy esg_reports_staff on public.esg_reports for all to authenticated
  using ((organization_id is not null and public.has_org_role(organization_id, array['owner','admin','rse']::public.member_role[])) or public.is_platform_admin())
  with check ((organization_id is not null and public.has_org_role(organization_id, array['owner','admin','rse']::public.member_role[])) or public.is_platform_admin());

-- Business
drop policy if exists plans_public_read on public.plans;
create policy plans_public_read on public.plans for select using (active = true or public.is_platform_admin());
drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions for select to authenticated using (
  user_id = auth.uid() or (organization_id is not null and public.is_org_member(organization_id)) or public.is_platform_admin()
);
drop policy if exists subscriptions_write on public.subscriptions;
create policy subscriptions_write on public.subscriptions for all to authenticated
  using (user_id = auth.uid() or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','finance']::public.member_role[])) or public.is_platform_admin())
  with check (user_id = auth.uid() or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','finance']::public.member_role[])) or public.is_platform_admin());

-- Gamification
drop policy if exists benefit_programs_read on public.benefit_programs;
create policy benefit_programs_read on public.benefit_programs for select to authenticated using (
  (organization_id is not null and public.is_org_member(organization_id))
  or (community_id is not null and public.is_community_member(community_id)) or public.is_platform_admin()
);
drop policy if exists benefit_points_read on public.benefit_points;
create policy benefit_points_read on public.benefit_points for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());
drop policy if exists challenges_read on public.challenges;
create policy challenges_read on public.challenges for select to authenticated using (
  (organization_id is not null and public.is_org_member(organization_id))
  or (community_id is not null and public.is_community_member(community_id)) or public.is_platform_admin()
);

-- Reviews : lecture publique (réputation), écriture de son propre avis.
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select using (true);
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated with check (reviewer_id = auth.uid());
drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews for update to authenticated using (reviewer_id = auth.uid());

-- Incidents
drop policy if exists incidents_read on public.incidents;
create policy incidents_read on public.incidents for select to authenticated using (
  reporter_id = auth.uid() or assigned_to = auth.uid()
  or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','support']::public.member_role[]))
  or public.is_platform_admin()
);
drop policy if exists incidents_report on public.incidents;
create policy incidents_report on public.incidents for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists incidents_update on public.incidents;
create policy incidents_update on public.incidents for update to authenticated using (
  assigned_to = auth.uid()
  or (organization_id is not null and public.has_org_role(organization_id, array['owner','admin','manager','support']::public.member_role[]))
  or public.is_platform_admin()
);

-- Messagerie (helper definer → pas de récursion)
drop policy if exists conversations_member_read on public.conversations;
create policy conversations_member_read on public.conversations for select to authenticated using (public.is_conversation_member(id));
drop policy if exists conv_members_read on public.conversation_members;
create policy conv_members_read on public.conversation_members for select to authenticated using (
  user_id = auth.uid() or public.is_conversation_member(conversation_id)
);
drop policy if exists conv_members_self_update on public.conversation_members;
create policy conv_members_self_update on public.conversation_members for update to authenticated using (user_id = auth.uid());
drop policy if exists messages_member_read on public.messages;
create policy messages_member_read on public.messages for select to authenticated using (public.is_conversation_member(conversation_id));
drop policy if exists messages_member_insert on public.messages;
create policy messages_member_insert on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and public.is_conversation_member(conversation_id)
);

grant execute on function public.create_carbon_event_for_ride_booking(uuid,uuid) to authenticated;
grant execute on function public.start_conversation(uuid,uuid) to authenticated;
grant execute on function public.list_conversations() to authenticated;
