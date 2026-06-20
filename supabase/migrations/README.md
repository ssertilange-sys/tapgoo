# TAPGOO OS — Migrations Supabase (fondation v2)

Refonte du `TAPGOO_MASTER_SCHEMA_v1.0` en migrations ordonnées, sécurisées et
rejouables, conformément au dossier (sections 8 Architecture, 9 Sécurité/RGPD,
26 Checklists).

## Principes

1. **Une migration = une couche cohérente.** On exécute dans l'ordre numérique.
2. **RLS livrée avec chaque table.** Aucune table exposée au client sans policy.
3. **Privacy by design.** Les données sensibles (`phone`, identité légale,
   adresse) vivent dans des tables privées accessibles à leur seul propriétaire.
   La lecture des autres membres passe par la vue `public_profiles`
   (ni téléphone ni email exposés).
4. **`service_role` jamais côté navigateur.** Le client n'utilise que la clé
   `anon` + RLS.
5. **Idempotence raisonnable** : `create … if not exists`, `drop policy if
   exists` avant `create policy`, `create or replace function`.

## Ordre d'exécution

| # | Fichier | Contenu |
|---|---------|---------|
| 0001 | extensions_and_types | extensions (pgcrypto, postgis) + enums métier |
| 0002 | identity_users | profils public/privé, settings, adresses, véhicules, consentements, audit + triggers |
| 0003 | organizations | organisations, sites, membres, invitations + helpers RBAC + RLS |
| 0004 | communities | communautés, membres, posts + RLS |
| 0005 | resources_rides | ressources génériques, trajets, arrêts, réservations + RPC transactionnels |
| 0006 | charging_parking | bornes, parking + triggers anti-chevauchement + RLS |
| 0007 | modules | solidarité, FMD/paie, carbone/ESG, business, messagerie + RLS |
| 0008 | views_and_seed | vues dashboard + facteurs d'émission ADEME (seed) |
| 0009 | tests_rls | scénarios de test RLS (pgTAP / à exécuter en intégration) |

## Application

### Supabase CLI (recommandé)
```bash
supabase db push        # applique les migrations en attente
```

### À la main (SQL Editor)
Exécuter les fichiers dans l'ordre numérique, un par un.

> ⚠️ Cette fondation est **incompatible** avec le schéma v3/v4 actuel
> (renommages, PostGIS, enums). Elle est destinée à un **nouveau projet
> Supabase « TAPGOO OS »**, pas à une mise à niveau de la base existante.
