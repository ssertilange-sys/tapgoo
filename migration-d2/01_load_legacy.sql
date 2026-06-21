-- ============================================================
-- 01 — Charge les données v4 (CSV) dans un schéma de staging "legacy".
-- À exécuter sur la base OS. Les \copy lisent ./dump/*.csv (psql -f).
-- ============================================================
create schema if not exists legacy;

create table if not exists legacy.profiles (
  id uuid primary key, email text, full_name text, avatar_url text, main_role text,
  phone text, city text, vehicle text, company text, bio text,
  created_at timestamptz, updated_at timestamptz);
create table if not exists legacy.rides (
  id uuid primary key, driver_id uuid, origin text, destination text, departure_time timestamptz,
  seats_total int, seats_available int, price_cents int, vehicle_info text, status text,
  distance_km numeric, created_at timestamptz, updated_at timestamptz);
create table if not exists legacy.ride_bookings (
  id uuid primary key, ride_id uuid, passenger_id uuid, seats_booked int, status text,
  created_at timestamptz, updated_at timestamptz);
create table if not exists legacy.charging_stations (
  id uuid primary key, owner_id uuid, name text, address text, city text, power_kw numeric,
  plug_type text, price_cents_per_kwh int, status text, description text,
  created_at timestamptz, updated_at timestamptz);
create table if not exists legacy.charging_bookings (
  id uuid primary key, station_id uuid, user_id uuid, starts_at timestamptz, ends_at timestamptz,
  status text, created_at timestamptz);
create table if not exists legacy.conversations (id uuid primary key, ride_id uuid, created_at timestamptz);
create table if not exists legacy.conversation_members (conversation_id uuid, user_id uuid, last_read_at timestamptz, primary key(conversation_id,user_id));
create table if not exists legacy.messages (id uuid primary key, conversation_id uuid, sender_id uuid, body text, created_at timestamptz);
create table if not exists legacy.companies (id uuid primary key, name text, siret text, contact_email text, created_by uuid, created_at timestamptz);
create table if not exists legacy.company_users (id uuid primary key, company_id uuid, user_id uuid, role text, created_at timestamptz);
create table if not exists legacy.contact_messages (id uuid primary key, nom text, email text, entreprise text, message text, created_at timestamptz);

-- Chargement (idempotent : on vide avant de recharger)
truncate legacy.profiles, legacy.rides, legacy.ride_bookings, legacy.charging_stations,
  legacy.charging_bookings, legacy.conversations, legacy.conversation_members,
  legacy.messages, legacy.companies, legacy.company_users, legacy.contact_messages;

\copy legacy.profiles from './dump/profiles.csv' csv header
\copy legacy.rides from './dump/rides.csv' csv header
\copy legacy.ride_bookings from './dump/ride_bookings.csv' csv header
\copy legacy.charging_stations from './dump/charging_stations.csv' csv header
\copy legacy.charging_bookings from './dump/charging_bookings.csv' csv header
\copy legacy.conversations from './dump/conversations.csv' csv header
\copy legacy.conversation_members from './dump/conversation_members.csv' csv header
\copy legacy.messages from './dump/messages.csv' csv header
\copy legacy.companies from './dump/companies.csv' csv header
\copy legacy.company_users from './dump/company_users.csv' csv header
\copy legacy.contact_messages from './dump/contact_messages.csv' csv header
