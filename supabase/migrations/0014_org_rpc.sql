-- ============================================================
-- 0014 — RPC espace entreprise
-- create_organization : crée l'org + rattache le créateur comme 'owner'
--   (sinon personne n'a le rôle owner/admin requis pour gérer les membres).
-- accept_organization_invitation : rejoindre une org via token (email vérifié).
-- ============================================================

create or replace function public.create_organization(
  p_name text,
  p_org_type public.org_type default 'company',
  p_siret text default null,
  p_billing_email text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_org uuid;
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Nom de l''organisation obligatoire.'; end if;

  insert into public.organizations(org_type, name, siret, billing_email, owner_user_id)
  values (p_org_type, trim(p_name), p_siret, p_billing_email, v_me)
  returning id into v_org;

  insert into public.organization_members(organization_id, user_id, role, status)
  values (v_org, v_me, 'owner', 'active')
  on conflict (organization_id, user_id) do nothing;

  return v_org;
end; $$;

create or replace function public.accept_organization_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_inv record; v_email text;
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;

  select * into v_inv from public.organization_invitations where token = p_token;
  if not found then raise exception 'Invitation introuvable.'; end if;
  if v_inv.accepted_at is not null then raise exception 'Invitation déjà utilisée.'; end if;
  if v_inv.expires_at < now() then raise exception 'Invitation expirée.'; end if;

  select email into v_email from auth.users where id = v_me;
  if lower(coalesce(v_email,'')) <> lower(v_inv.email) then
    raise exception 'Cette invitation ne correspond pas à votre adresse email.';
  end if;

  insert into public.organization_members(organization_id, user_id, role, status)
  values (v_inv.organization_id, v_me, v_inv.role, 'active')
  on conflict (organization_id, user_id) do update set role = excluded.role, status = 'active';

  update public.organization_invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.organization_id;
end; $$;

grant execute on function public.create_organization(text,public.org_type,text,text) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;
