#!/usr/bin/env bash
# Dump de la base v4 : comptes (auth) + tables métier (public → CSV).
# Usage : V4="postgresql://..." bash 00_dump_v4.sh
set -euo pipefail
: "${V4:?Définir V4 = chaîne de connexion à la base v4}"
OUT="./dump"
mkdir -p "$OUT"

echo "→ Dump auth.users + auth.identities (data-only, ids préservés)"
pg_dump "$V4" --data-only --no-owner --no-privileges \
  --table='auth.users' --table='auth.identities' \
  -f "$OUT/auth_data.sql"

echo "→ Export des tables métier v4 en CSV"
copy_csv () { # $1 = table, $2 = colonnes
  psql "$V4" -v ON_ERROR_STOP=1 -c "\copy (select $2 from public.$1) to '$OUT/$1.csv' csv header"
}
copy_csv profiles            "id,email,full_name,avatar_url,main_role,phone,city,vehicle,company,bio,created_at,updated_at"
copy_csv rides               "id,driver_id,origin,destination,departure_time,seats_total,seats_available,price_cents,vehicle_info,status,distance_km,created_at,updated_at"
copy_csv ride_bookings       "id,ride_id,passenger_id,seats_booked,status,created_at,updated_at"
copy_csv charging_stations   "id,owner_id,name,address,city,power_kw,plug_type,price_cents_per_kwh,status,description,created_at,updated_at"
copy_csv charging_bookings   "id,station_id,user_id,starts_at,ends_at,status,created_at"
copy_csv conversations       "id,ride_id,created_at"
copy_csv conversation_members "conversation_id,user_id,last_read_at"
copy_csv messages            "id,conversation_id,sender_id,body,created_at"
copy_csv companies           "id,name,siret,contact_email,created_by,created_at"
copy_csv company_users       "id,company_id,user_id,role,created_at"
copy_csv contact_messages    "id,nom,email,entreprise,message,created_at"

echo "✓ Dump terminé dans $OUT"
