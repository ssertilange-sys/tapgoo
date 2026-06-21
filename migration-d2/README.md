# Migration D2 — reprise v4 → TAPGOO OS

> **Scripts de préparation. Rien n'est exécuté automatiquement.**
> On dump la base v4, on charge dans un schéma `legacy` du projet OS, puis on
> transforme par `INSERT … SELECT`. La base v4 reste **intacte** (rollback).

## ⚠️ Prérequis impératifs (dans l'ordre)
1. Projet **tapgoo-os** créé + migrations `0001→0014` appliquées (`supabase db push`).
2. **Recette fonctionnelle** du MVP validée sur preview.
3. **Dry-run** de cette migration sur une **copie staging** d'OS (jamais en prod direct).
4. Variables d'environnement de connexion :
   - `V4="postgresql://...v4..."`  (connexion directe à la base v4 — Settings → Database)
   - `OS="postgresql://...tapgoo-os..."`

> La base OS de cible doit avoir une `auth.users` **vide** (effacer les comptes
> de test créés pendant la recette) avant l'étape auth — sinon collisions d'ID.

## Ordre d'exécution
```bash
# 0) Dump v4 (auth + tables public) → dossier ./dump
bash 00_dump_v4.sh

# 1) Charger les données v4 dans le schéma legacy d'OS
psql "$OS" -v ON_ERROR_STOP=1 -f 01_load_legacy.sql

# 2) Comptes : restaurer auth.users + auth.identities (PRESERVE les id → SSO Google)
#    (le trigger handle_new_user crée les profils squelettes)
psql "$OS" -v ON_ERROR_STOP=1 -f ./dump/auth_data.sql

# 3) Transformations (idempotentes, ON CONFLICT DO NOTHING)
psql "$OS" -v ON_ERROR_STOP=1 -f 03_profiles.sql
psql "$OS" -v ON_ERROR_STOP=1 -f 04_organizations.sql
psql "$OS" -v ON_ERROR_STOP=1 -f 05_rides.sql
psql "$OS" -v ON_ERROR_STOP=1 -f 06_ride_bookings.sql
psql "$OS" -v ON_ERROR_STOP=1 -f 07_charging.sql
psql "$OS" -v ON_ERROR_STOP=1 -f 08_messaging.sql
psql "$OS" -v ON_ERROR_STOP=1 -f 09_contact_archive.sql

# 4) Vérification (comptages avant/après + orphelins)
psql "$OS" -f 50_verify.sql
```

## Points de vigilance
- **auth.users (étape 2)** = l'opération la plus risquée. À tester en priorité sur
  staging. Versions GoTrue des deux projets doivent être proches. Alternative :
  outils d'export/import de comptes Supabase.
- Les triggers `prevent_charging_overlap` peuvent bloquer des bookings historiques
  qui se chevauchent : si l'import 07 échoue, les désactiver le temps du load
  (`alter table public.charging_bookings disable trigger trg_prevent_charging_overlap;`
  … `enable` après).
- Champs **abandonnés** (sans équivalent OS, archivés dans `legacy`) : `profiles.bio`,
  `companies`→`organizations` (texte « company » du profil), `station_reports`,
  `company_requests`.

## Cutover (Lot 9) — voir 99_rollback.md
Une fois la migration vérifiée : bascule des variables Vercel de prod vers OS,
smoke tests, puis fenêtre d'observation. **Rollback = repointer vers v4** (intact).
