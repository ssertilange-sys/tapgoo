# Lot 9 — Cutover & Rollback

## Avant le cutover (checklist)
- [ ] Recette MVP validée sur preview.
- [ ] Dry-run de la migration D2 sur **copie staging** d'OS → `50_verify.sql` OK (comptages cohérents, 0 orphelin).
- [ ] Migration des comptes `auth.users` testée (connexion Google d'un compte migré OK sur staging).
- [ ] Sauvegarde/snapshot du projet v4 (PITR ou export).
- [ ] Fenêtre de maintenance annoncée (~1 h).

## Cutover (ordre)
1. (Optionnel) Passer le site v4 en lecture seule / bannière maintenance.
2. Exécuter la migration D2 réelle sur **tapgoo-os** (00→09 puis 50_verify).
3. Configurer **Supabase OS → Auth** : provider Google + Site URL/Redirect URLs = domaine de prod.
4. **Vercel (Production)** : remplacer les variables d'env par celles de **tapgoo-os**
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
5. Redéployer la prod (ou promouvoir le déploiement de la branche).
6. **Smoke tests** prod : login Google (compte migré), recherche trajet, réservation, messagerie, /api/contact.

## Rollback (si problème)
**Repointer Vercel Production vers la base v4** (restaurer les anciennes variables d'env) puis redéployer. La base v4 n'ayant été **ni supprimée ni modifiée**, le retour est immédiat (2–5 min).

> Conserver le projet v4 intact **2 à 4 semaines** après le cutover avant toute
> suppression. Ne JAMAIS exécuter ces scripts sur la base v4.
