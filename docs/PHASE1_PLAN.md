# TAPGOO — Plan Phase 1 (migration v4 → OS + MVP)

> Document de cadrage. Stratégie **D2** (reprise des données et des comptes).
> Aucune ligne de code applicatif tant que la Phase 1 n'est pas explicitement lancée.
> Diagramme relationnel : `docs/tapgoo_os_schema.png`.

## 0. Décisions actées
- **D2** : reprise des données existantes + migration des comptes `auth.users`.
- **3 briques cœur au même niveau** : covoiturage · bornes · **parking** (parking ≠ secondaire).
- **`contact_messages` réintroduit** dans OS pour conserver `/api/contact`.
- **Espace entreprise minimal dans le MVP**.
- **Réservations multi-passagers natives** pour le covoiturage (voir §4).
- **Couche de compatibilité `lib/api.ts` à contrat constant** : on garde les
  signatures publiques des fonctions, on réécrit l'intérieur pour OS → les
  pages v4 changent au minimum.
- **Strangler pattern** : la prod v4 reste intacte ; OS construit en parallèle
  (projet Supabase + preview Vercel dédiés) ; cutover contrôlé avec rollback.

---

## 1. Cartographie de compatibilité v4 → OS (résumé)

### Tables
- 🟢 **Identiques** : `conversations`, `conversation_members`, `messages`.
- 🟠 **Changées** (même nom, structure/sémantique ≠) : `profiles`, `rides`,
  `ride_bookings`, `charging_stations`, `charging_bookings`.
- 🔵 **Nouvelles** : `user_private_profiles`, `user_settings`, `user_vehicles`,
  `mobility_resources`, `ride_stops`, `parking_spots`, `parking_bookings`,
  `organizations`, `organization_members`, `communities`, FMD/carbone/business…
- 🔴 **Disparues / remplacées** : `companies`→`organizations`,
  `company_users`→`organization_members`, `station_reports`→`incidents`/`reviews`,
  `company_requests`→archive, `contact_messages`→**réintroduit**.

### RPC
| v4 | OS | Verdict |
|---|---|---|
| `book_ride(ride, passenger)` | `book_ride(ride, seats)` | signature + workflow changés |
| `cancel_ride_booking(booking, passenger)` | `cancel_my_booking(booking)` | renommé |
| `delete_my_ride(ride, driver)` | *(aucun)* | supprimé → update statut |
| insert `rides` | `create_ride(...)` | remplacé par RPC |
| insert `charging_stations` | `create_charging_station(...)` | remplacé par RPC |
| `start_conversation`, `list_conversations` | identiques | ✅ |
| — | `respond_to_booking`, `validate_ride_booking`, `create_parking_spot`, `book_charging_slot`, `book_parking_slot` | nouveaux |

### `lib/api.ts`
- 🟢 OK : `getCurrentUser(OrThrow)`, `uploadAvatar`, `startConversation`,
  `listConversations`, `getMessages`, `sendMessage`.
- 🟠 Adapter : `cancelBooking`, `deleteRide`, `getProfile`.
- 🔴 Réécrire : `ensureProfile`, `searchTrips`, `createRide`, `bookTrip`,
  `getMyDashboard`, `searchStations`, `createStation`, `updateProfile`.

### Pages
- 🟢 `/messages`, `/connexion` ; 🟠 `/bornes`, `/` ;
- 🔴 `/covoiturage`, `/dashboard`, `/profil`, `/entreprises` (+ `/api/contact`).

---

## 2. Plan de migration des données (D2)

ETL via schéma de staging `legacy` dans OS, transformations `INSERT…SELECT`.
Ordre imposé par les FK :
`auth.users → profiles/user_private_profiles → organizations/members →
mobility_resources+rides → ride_bookings → charging_* → conversations→messages`.

### Mappings clés
- **auth.users + auth.identities** : copie en **préservant les `id`** (FK + SSO
  Google). Le trigger `handle_new_user` crée les squelettes ; l'ETL les **UPDATE**.
- **profiles** → `profiles` (`full_name`→`display_name`, `city`→`default_city`,
  `main_role`→`account_type`) + `user_private_profiles` (`phone`) +
  `user_vehicles` (`vehicle`). `bio` archivé (pas de champ OS).
- **rides** → `mobility_resources`(type `ride`, prix, `metadata.vehicle_info`) +
  `rides`(`origin`→`origin_label`, `price_cents`→`suggested_price_cents`,
  `status 'active'`→`'published'`, `seats_available` **verbatim**).
- **ride_bookings** → `seats_booked`→`seats`, `confirmed`→`accepted`,
  `expected_direct_payment_cents = prix × seats`. Pas de re-décrément.
- **charging_stations** → `mobility_resources` + `charging_stations`
  (`owner_id`→`owner_user_id`, `plug_type`→`connector_type`,
  `status`→`is_active`).
- **parking_spots/bookings** : **aucune reprise** (inexistant en v4) → net-new.
- **conversations/members/messages** : copie 1:1 (`id` préservés).
- **companies/company_users** → `organizations`/`organization_members`.
- **contact_messages/company_requests/station_reports** → archive `legacy` (+
  `contact_messages` réintroduit pour le flux courant).

### Scripts ETL à créer (`migration-d2/`)
```
00_dump_v4.sh          pg_dump v4 (public + auth)
01_load_legacy.sql     restore dans schéma legacy (OS)
02_auth_users.sql      auth.users + auth.identities (id préservés)
03_profiles.sql        profiles + user_private_profiles + user_vehicles
04_organizations.sql   companies→orgs, company_users→members
05_rides.sql           mobility_resources + rides (+ metadata)
06_ride_bookings.sql   workflow + expected_payment
07_charging.sql        resources + charging_stations + bookings
08_messaging.sql       conversations + members + messages (1:1)
09_contact_archive.sql contact_messages / company_requests
50_verify.sql          comptages avant/après + intégrité FK
99_rollback.md         procédure (repointage env vars, aucun DROP en prod)
run_dry.sh             rejoue l'ETL sur une copie staging d'OS
```

### Temps estimés
| Phase | Durée |
|---|---|
| Écriture + test des scripts ETL (staging) | 1–2 j dev |
| Dry-run complet + vérifs | 1–2 h |
| Cutover réel (dump→load→transform→vérif) | 15–40 min |
| Bascule env vars Vercel + smoke tests | 10–15 min |
| **Rollback** (repointage vers v4 intact) | 2–5 min |

---

## 3. Réintroductions / prérequis OS (Lot 0)
- **Table `contact_messages`** (nom, email, entreprise, message, created_at) +
  RLS (insert via service_role uniquement, lecture admin).
- **Bucket Storage `avatars`** (pour `uploadAvatar`).
- **Seed `plans`** (Free/Plus/Hôte/Commerce/Entreprise…) pour l'espace entreprise.
- **Projet Supabase `tapgoo-os`** + **preview Vercel** avec ses propres env vars.

---

## 4. Réservations multi-passagers (capacité cœur — DÉJÀ native en OS)

Déjà supporté par la Phase 0, à exposer dans l'UI :
- `ride_bookings.seats int check (seats between 1 and 8)` → **plusieurs places
  sur une même réservation**.
- `rides.seats_total` / `rides.seats_available (check >= 0)` → **places restantes**.
- `book_ride(p_ride_id, p_seats)` : demande de N places (vérifie la dispo).
- `respond_to_booking(p_booking_id, accept)` : à l'acceptation, **décrément de
  `seats_available` de `booking.seats` sous `FOR UPDATE`** → **anti-surbooking**.
- `cancel_my_booking` : **restitue `booking.seats`** si la résa était acceptée.

**Garanties** : pas de surréservation (verrou ligne + check `>= 0`), unicité
`(ride_id, passenger_id)` (un passager = une réservation par trajet, avec N places),
restitution correcte à l'annulation.

**À ajouter au front** (Phase 1) : sélecteur « nombre de places » à la
réservation, affichage « X places restantes », état « en attente
d'acceptation » côté passager, écran d'acceptation côté conducteur.

---

## 5. Fonctionnalités MVP (back-end prêt en Phase 0)

| # | Fonctionnalité | Back OS (prêt) | Front Phase 1 |
|---|---|---|---|
| 1 | Authentification | auth + `handle_new_user` + `public_profiles` | retirer `ensureProfile` |
| 2 | Profil | `profiles`+`user_private_profiles`+`user_vehicles` | mapping public/privé |
| 3 | Covoiturage | `rides`,`mobility_resources`,`create_ride`,recherche | recherche/publication |
| 4 | Réservation covoiturage (multi-passagers) | `ride_bookings`,`book_ride`,`respond_to_booking`,`cancel_my_booking`,`validate_ride_booking` | états pending→accepted + sélecteur places |
| 5 | Bornes | `charging_stations`,`create_charging_station` | recherche/publication |
| 6 | Réservation bornes | `charging_bookings`,`book_charging_slot` | UI créneau |
| 7 | Parking (cœur) | `parking_spots`,`create_parking_spot` | publication |
| 8 | Réservation parking (cœur) | `parking_bookings`,`book_parking_slot` | UI créneau (mutualisée avec bornes) |
| 9 | Messagerie | `conversations`/`messages`,`start_conversation`/`list_conversations` | quasi rien |
| 10 | Espace entreprise minimal | `organizations`,`organization_members`,`v_organization_mobility_dashboard` | écran org + invitations + dashboard |

---

## 6. Plan d'implémentation Phase 1 (ordonné)

> Chaque lot : contrat `lib/api.ts` constant quand possible, critères d'acceptation
> testables, aucun impact prod (preview only) jusqu'au cutover (Lot 9).

### Lot 0 — Prérequis OS
- Réintroduire `contact_messages` (migration `0010_contact_messages.sql`), bucket
  `avatars`, seed `plans`.
- Projet OS + preview Vercel + env vars.
- **Acceptation** : `supabase db push` OK, `/api/contact` insère, bucket présent.

### Lot 1 — Auth + Messagerie (compatibles)
- Retirer `ensureProfile` (le trigger crée le profil) ; vérifier login Google,
  conversations, envoi/lecture messages.
- **Acceptation** : connexion → profil auto-créé ; messagerie fonctionnelle.

### Lot 2 — Profil
- `getProfile` (jointure `profiles` + `user_private_profiles`),
  `updateProfile` (écrit public vs privé vs véhicule), `uploadAvatar` inchangé.
- **Acceptation** : édition nom/ville (public), téléphone (privé), véhicule.

### Lot 3 — Covoiturage (recherche + publication)
- `searchTrips` : `rides` (`origin_label`…, statut `published`) + conducteur via
  `public_profiles` ; `createRide` → RPC `create_ride`.
- UI : affichage « places restantes ».
- **Acceptation** : recherche (anon incluse), publication d'un trajet.

### Lot 4 — Réservations covoiturage (multi-passagers)
- `bookTrip` → `book_ride(ride, seats)` ; nouvel `acceptBooking`/`rejectBooking`
  → `respond_to_booking` ; `cancelBooking` → `cancel_my_booking` ;
  `validateBooking` → `validate_ride_booking`.
- UI : sélecteur de places ; états pending/accepted ; écran conducteur d'acceptation.
- **Acceptation** : réserver N places → conducteur accepte → places décrémentées ;
  surréservation refusée ; annulation restitue les places.

### Lot 5 — Bornes
- `searchStations` (is_active/visibilité), `createStation` → `create_charging_station`,
  réservation → `book_charging_slot` (composant créneau).
- **Acceptation** : publier une borne, réserver un créneau, conflit refusé.

### Lot 6 — Parking (cœur)
- `searchParking`, `createParking` → `create_parking_spot`, réservation →
  `book_parking_slot`. **Composant « créneau » mutualisé avec les bornes.**
- **Acceptation** : publier une place, réserver un créneau, conflit refusé.

### Lot 7 — Espace entreprise minimal
- Créer une organisation, inviter des membres (rôles), dashboard
  `v_organization_mobility_dashboard`.
- **Acceptation** : créer org, inviter, voir indicateurs agrégés.

### Lot 8 — ETL D2 (scripts + dry-run)
- Écrire `migration-d2/*`, exécuter sur **copie staging** d'OS, vérifier comptages
  et intégrité FK.
- **Acceptation** : dry-run sans orphelin ; comptes Google fonctionnels en staging.

### Lot 9 — Cutover
- Fenêtre de maintenance, exécution ETL, bascule env vars Vercel, smoke tests.
- **Rollback** : repointer vers v4 (laissé intact 2–4 semaines).
- **Acceptation** : les 5 domaines (auth, profils, covoiturage, réservations,
  messagerie) opérationnels en prod sur OS.

---

## 7. Risques & garde-fous
- **Prod intacte** tant que les env vars Vercel ne changent pas (Lots 0–8 = preview).
- **Migration `auth.users`** : risque le plus élevé → tester en priorité (Lot 8).
- **`/api/contact`** : couvert par la réintroduction de `contact_messages` (Lot 0).
- **Rollback** garanti tant que le projet v4 n'est ni supprimé ni modifié.
