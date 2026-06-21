# TAPGOO OS — Rapport de recette MVP

> Branche : `claude/nice-mayer-damn5j` · Cible : projet Supabase **tapgoo-os**
> (séparé de la prod v4). Aucun ETL D2 ni cutover effectué.

## 1. URL de preview
La preview est générée par **Vercel** au déploiement de la branche
`claude/nice-mayer-damn5j` (avec des env vars pointant vers `tapgoo-os`).
Format type : `https://tapgoo-<hash>-<scope>.vercel.app`.

> ⚠️ L'URL exacte n'est pas connue depuis cet environnement (le `git push` est
> bloqué en 403 dans le conteneur). Pour l'obtenir : pousser la branche, puis
> Vercel → projet → onglet **Deployments** → dernier déploiement Preview.
> Prérequis preview : `supabase db push` (migrations 0001→0014) + env vars
> `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` du projet OS.

## 2. Fonctionnalités livrées (Lots 0→7)
| # | Fonctionnalité | Détail |
|---|---|---|
| 0 | Prérequis | `contact_messages`, bucket `avatars`, seed `plans` |
| 1 | **Authentification** | Google OAuth ; profil créé auto (trigger) ; `ensureProfile` non destructif |
| 2 | **Profil** | nom/ville (public), téléphone (privé), véhicule ; entreprises en lecture seule |
| 3 | **Covoiturage** | recherche (anon incluse), publication via RPC, « places restantes » |
| 4 | **Réservations multi-passagers** | N places/réservation, workflow pending→accepté→complété, anti-surbooking, demandes côté conducteur, statuts |
| 5 | **Bornes** | recherche, publication, réservation de créneau (anti-chevauchement) |
| 6 | **Parking** (cœur) | page dédiée, publication, réservation de créneau (composant mutualisé) |
| — | **Messagerie** | conversations 1-à-1, envoi/lecture (inchangée, compatible) |
| 7 | **Espace entreprise** | créer org, inviter (token), rejoindre, gérer rôles (RBAC), tableau de bord agrégé |

## 3. Schéma final — tables utilisées par le MVP
**Identité** : `profiles` (public), `user_private_profiles` (téléphone/identité),
`user_vehicles`, vue `public_profiles` (lecture des autres membres, sans PII).
**Ressources** : `mobility_resources` (pivot), `rides` (+ `vehicle_info`),
`ride_bookings` (`seats`, statut enum), `charging_stations`, `charging_bookings`,
`parking_spots`, `parking_bookings`.
**Messagerie** : `conversations`, `conversation_members`, `messages`.
**Entreprise** : `organizations`, `organization_members`, `organization_invitations`,
`organization_sites` ; vues `v_organization_mobility_dashboard`, `v_user_mobility_summary`.
**Divers** : `contact_messages`, `plans`.
**Prêtes mais non exposées (post-MVP)** : `communities*`, `solidarity_*`,
`fmd_policies`, `mobility_proofs`, `payroll_exports`, `emission_factors`,
`carbon_events`, `esg_reports`, `subscriptions`, `benefit_*`, `challenges`,
`reviews`, `incidents`, `ride_stops`, `audit_logs`, `security_events`, `user_consents`.

## 4. Migrations exécutées (ordre)
`0001` extensions+types · `0002` identité/RGPD · `0003` organisations ·
`0004` communautés · `0005` cœur covoiturage+RPC · `0006` bornes/parking ·
`0007` modules (FMD/carbone/business/messagerie) · `0008` index/vues/seed ADEME ·
`0009` grants RLS · `0010` contact_messages · `0011` storage avatars ·
`0012` seed plans · `0013` rides.vehicle_info · `0014` RPC entreprise.
> Validées par exécution réelle (Postgres 16 + PostGIS 3.4) ; à appliquer sur
> `tapgoo-os` via `supabase db push`.

## 5. Endpoints / API impactés
**Route serveur** : `POST /api/contact` → `contact_messages` (service_role).
**`lib/api.ts` (contrat constant côté pages)** :
| Domaine | Fonctions | RPC / table OS |
|---|---|---|
| Auth | getCurrentUser(OrThrow), ensureProfile, uploadAvatar | auth, profiles, storage |
| Profil | getProfile, updateProfile | profiles + user_private_profiles + user_vehicles + organizations |
| Covoiturage | searchTrips, createRide, deleteRide | `create_ride`, rides, public_profiles |
| Réservations | bookTrip, respondToBooking, cancelBooking, validateBooking, getMyDashboard | `book_ride`, `respond_to_booking`, `cancel_my_booking`, `validate_ride_booking` |
| Bornes | searchStations, createStation, bookChargingSlot | `create_charging_station`, `book_charging_slot` |
| Parking | searchParking, createParking, bookParkingSlot | `create_parking_spot`, `book_parking_slot` |
| Messagerie | startConversation, listConversations, getMessages, sendMessage | `start_conversation`, `list_conversations`, messages |
| Entreprise | createOrganization, getMyOrganizations, getOrganization, inviteMember, acceptInvitation, updateMemberRole, removeMember | `create_organization`, `accept_organization_invitation`, organization_* |

## 6. Check-list de tests manuels (sur la preview)
**Auth/Profil**
- [ ] Connexion Google → redirection /dashboard, profil créé automatiquement.
- [ ] /profil : modifier nom, ville, téléphone, véhicule → « Profil enregistré » ; recharger → valeurs persistées.
- [ ] Email affiché en lecture seule ; téléphone non visible par un autre compte.

**Covoiturage + réservations**
- [ ] Publier un trajet (départ/arrivée/date/places/prix/véhicule) → visible en recherche.
- [ ] Recherche sans être connecté → résultats visibles ; nom du conducteur affiché.
- [ ] Depuis un 2e compte : choisir N places → « Réserver » → « en attente de validation ».
- [ ] Conducteur : /dashboard → « Demandes reçues » → Accepter → places restantes décrémentées de N.
- [ ] Sur-réservation : accepter une demande au-delà des places restantes → refus.
- [ ] Passager : annuler → places restituées ; statut « Annulée ».

**Bornes / Parking**
- [ ] Publier une borne / une place → visible en recherche (anon incluse).
- [ ] Réserver un créneau → confirmation ; réserver un créneau chevauchant → refus.

**Messagerie**
- [ ] « Contacter » un conducteur → conversation créée → envoi/réception de messages.

**Entreprise**
- [ ] Créer une organisation → vous êtes `owner` ; tableau de bord affiché.
- [ ] Inviter un email → token affiché ; depuis le compte invité, « Rejoindre via invitation » → membre ajouté.
- [ ] Changer un rôle / retirer un membre (owner/admin) ; un `member` n'a pas ces droits.
- [ ] Un non-membre n'accède pas à l'organisation.

**Contact**
- [ ] /entreprises → formulaire → enregistrement dans `contact_messages` (+ email si Resend configuré).

## 7. Risques connus
- **Migration des comptes `auth.users` (D2)** : non effectuée — risque le plus élevé du cutover (à tester en priorité au Lot 8).
- **Push GitHub bloqué (403)** dans le conteneur : les commits ne sont pas encore sur le remote ; récupération via patch/bundle.
- **Invitations sans email** : le token est affiché et transmis manuellement (Resend non câblé pour les invitations).
- **Géoloc absente** : trajets/ressources sans coordonnées (champs PostGIS NULL) → recherche par texte (ilike), pas encore par rayon géographique.
- **Messagerie en polling** (10 s), pas de temps réel ni de non-lus.
- **`bio` profil supprimé** (pas de champ OS, acté).
- **SQL validé en local** (shim Supabase) : revérifier au premier `supabase db push` réel (storage/auth gérés par Supabase).

## 8. Reste à développer après le MVP
- **ETL D2 + cutover** (Lots 8–9) : reprise données + comptes, bascule prod.
- **FMD / paie** : exposer `fmd_policies`, `mobility_proofs`, exports `payroll_exports`.
- **Reporting carbone/ESG** : brancher `emission_factors`/`carbon_events`/`esg_reports` au dashboard.
- **Multi-sites** : rattacher membres/ressources à `organization_sites`, agrégats par site.
- **Communautés**, **mobilité solidaire**, **gamification** (benefits/challenges), **reviews/incidents**.
- **Recherche géospatiale** (`ST_DWithin`) + carte (Leaflet/MapLibre).
- **Messagerie temps réel** + non-lus ; **envoi d'emails** (Resend) pour invitations/notifications.
- **Abonnements** (`plans`/`subscriptions`) + facturation.
- **Tests automatisés** (pgTAP complet + e2e) et CI.
