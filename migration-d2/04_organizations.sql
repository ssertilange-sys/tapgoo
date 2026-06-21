-- ============================================================
-- 04 — companies → organizations ; company_users → organization_members
-- ============================================================
insert into public.organizations (id, org_type, name, siret, billing_email, owner_user_id, created_at)
select c.id, 'company', c.name, c.siret, c.contact_email, c.created_by, coalesce(c.created_at, now())
from legacy.companies c
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status)
select cu.company_id, cu.user_id,
       (case cu.role when 'owner' then 'owner' when 'admin' then 'admin' else 'member' end)::public.member_role,
       'active'
from legacy.company_users cu
on conflict (organization_id, user_id) do nothing;

-- Garantir que le créateur est membre 'owner'.
insert into public.organization_members (organization_id, user_id, role, status)
select c.id, c.created_by, 'owner', 'active'
from legacy.companies c
where c.created_by is not null
on conflict (organization_id, user_id) do nothing;
