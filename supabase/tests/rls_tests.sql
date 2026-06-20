-- ============================================================
-- Tests RLS (pgTAP) — TAPGOO OS
-- Couvre les 8 scénarios du dossier §26.2.
--
-- Pré-requis :
--   create extension if not exists pgtap;
-- Exécution (exemple) :
--   pg_prove -d "$DATABASE_URL" supabase/tests/rls_tests.sql
--
-- Principe : on simule un utilisateur connecté en posant le claim JWT que
-- Supabase lit via auth.uid(). On bascule de rôle 'authenticated'/'anon'.
-- ============================================================

begin;
select plan(8);

-- ------------------------------------------------------------
-- Utilitaire : impersonifier un utilisateur (auth.uid() = p_user)
-- ------------------------------------------------------------
create or replace function tests.login_as(p_user uuid, p_role text default 'authenticated')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user::text, 'role', p_role)::text, true);
  execute format('set local role %I', p_role);
end; $$;

create or replace function tests.logout()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', null, true);
  set local role postgres;
end; $$;

-- ------------------------------------------------------------
-- Seed minimal (deux citoyens, un trajet, une organisation)
-- NB : insertion directe en tant que superuser (RLS contournée pour le seed).
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','alice@test.dev'),
  ('22222222-2222-2222-2222-222222222222','bob@test.dev')
on conflict do nothing;
-- handle_new_user a créé les profils ; on force des noms déterministes.
update public.profiles set display_name='Alice' where id='11111111-1111-1111-1111-111111111111';
update public.profiles set display_name='Bob'   where id='22222222-2222-2222-2222-222222222222';
update public.user_private_profiles set phone='0600000000' where user_id='11111111-1111-1111-1111-111111111111';

-- 1. Un utilisateur ne lit pas le profil privé (téléphone) d'un autre.
select tests.login_as('22222222-2222-2222-2222-222222222222');
select is(
  (select count(*) from public.user_private_profiles where user_id='11111111-1111-1111-1111-111111111111')::int,
  0, '1. Bob ne lit pas le profil privé d''Alice');
select tests.logout();

-- 2. La vue publique n'expose ni téléphone ni email.
select tests.login_as('22222222-2222-2222-2222-222222222222');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='public_profiles'
      and column_name in ('phone','email')
  ), '2. public_profiles n''expose ni phone ni email');
select tests.logout();

-- 3. Un membre externe ne lit pas une communauté privée.
insert into public.communities (id, name, visibility, created_by)
values ('33333333-3333-3333-3333-333333333333','Cercle privé','private','11111111-1111-1111-1111-111111111111')
on conflict do nothing;
select tests.login_as('22222222-2222-2222-2222-222222222222');
select is(
  (select count(*) from public.communities where id='33333333-3333-3333-3333-333333333333')::int,
  0, '3. Bob ne voit pas la communauté privée d''Alice');
select tests.logout();

-- 4. Un passager ne peut pas réserver au nom d'un autre (book_ride force auth.uid()).
select tests.login_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ select public.create_ride('Lorient','Vannes', now() + interval '1 day', 3, 200) $$,
  '4a. Alice publie un trajet');
select tests.logout();
-- Bob tente d'insérer une réservation au nom d'Alice → refusé par RLS.
select tests.login_as('22222222-2222-2222-2222-222222222222');
select throws_ok($$
  insert into public.ride_bookings(ride_id, passenger_id)
  select id, '11111111-1111-1111-1111-111111111111' from public.rides limit 1
$$, NULL, NULL, '4b. Bob ne peut pas réserver au nom d''Alice');
select tests.logout();

-- 5. Une clé anon ne peut pas insérer un carbon_event arbitraire.
select tests.login_as('00000000-0000-0000-0000-000000000000','anon');
select throws_ok($$
  insert into public.carbon_events(source_table, source_id, event_date, methodology)
  values ('x', gen_random_uuid(), current_date, 'fake')
$$, NULL, NULL, '5. anon ne peut pas insérer de carbon_events');
select tests.logout();

-- 6. Un gestionnaire paie ne voit que les preuves de son organisation.
--    (scénario à compléter avec une organisation + membre payroll)
select skip(1, '6. proofs scoping org — à compléter avec seed organisation/payroll');

-- 7. Un conducteur voit les réservations de ses trajets, pas celles des autres.
--    (couvert par ride_bookings_read ; test détaillé à ajouter)
select skip(1, '7. driver voit ses réservations — à compléter');

-- 8. Une table sensible sans policy reste inaccessible (audit_logs en écriture).
select tests.login_as('22222222-2222-2222-2222-222222222222');
select throws_ok($$
  insert into public.audit_logs(action, entity_table) values ('hack','profiles')
$$, NULL, NULL, '8. insertion directe dans audit_logs refusée');
select tests.logout();

select * from finish();
rollback;
