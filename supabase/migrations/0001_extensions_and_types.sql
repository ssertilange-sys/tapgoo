-- ============================================================
-- 0001 — Extensions & types métier
-- Socle technique + vocabulaire contrôlé (enums) de TAPGOO OS.
-- ============================================================

-- pgcrypto : gen_random_uuid(), gen_random_bytes() (tokens d'invitation).
create extension if not exists pgcrypto;
-- postgis : colonnes geography + index GiST pour le matching géospatial.
create extension if not exists postgis;

-- ------------------------------------------------------------
-- Enums (idempotents : on ignore l'erreur si le type existe déjà)
-- ------------------------------------------------------------

-- Nature du compte : citoyen, professionnel, admin d'organisation, admin plateforme.
do $$ begin
  create type public.account_type as enum ('citizen','professional','organization_admin','platform_admin');
exception when duplicate_object then null; end $$;

-- Type d'organisation (entreprise, collectivité, asso, commerce, etc.).
do $$ begin
  create type public.org_type as enum ('company','collectivity','association','commerce','education','healthcare','public_service','other');
exception when duplicate_object then null; end $$;

-- Rôles applicables aux organisations ET aux communautés (RBAC fin : RH, paie, RSE…).
do $$ begin
  create type public.member_role as enum ('owner','admin','manager','moderator','member','viewer','payroll','finance','rse','facility','support');
exception when duplicate_object then null; end $$;

-- Niveau de visibilité d'une ressource ou d'une communauté.
do $$ begin
  create type public.visibility_level as enum ('public','community','organization','private','unlisted');
exception when duplicate_object then null; end $$;

-- Types de ressources de mobilité orchestrées par le graphe.
do $$ begin
  create type public.resource_type as enum ('ride','recurring_ride','charging_station','parking_spot','garage','vehicle','bike','cargo_bike','solidarity_ride','event_mobility');
exception when duplicate_object then null; end $$;

-- Machine à états des réservations (trajets, bornes, parking, solidarité).
do $$ begin
  create type public.booking_status as enum ('draft','pending','accepted','rejected','cancelled','completed','no_show','disputed','expired');
exception when duplicate_object then null; end $$;

-- Mode de paiement DIRECT entre utilisateurs (TAPGOO n'encaisse pas — cf. dossier §5/§25).
do $$ begin
  create type public.payment_mode as enum ('outside_tapgoo','wero_direct','sepa_direct','cash','psp_integrated_later','free_or_sponsored');
exception when duplicate_object then null; end $$;

-- Finalités de consentement RGPD (versionnées dans user_consents).
do $$ begin
  create type public.consent_purpose as enum ('terms','privacy','location_precise','marketing','carbon_reporting','fmd_processing','analytics','community_visibility','solidarity_processing');
exception when duplicate_object then null; end $$;
