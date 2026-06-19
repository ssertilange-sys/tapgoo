# TAPGOO v4 — Guide de mise en ligne

## 1. Base de données (obligatoire)
Dans Supabase → SQL Editor, exécuter les **deux** scripts **dans cet ordre** :

1. `supabase/tapgoo_schema.sql` — schéma de base (tables, RLS, fonctions).
   **À lancer en premier** : il crée les tables sur lesquelles s'appuie la
   mise à niveau. Sans lui, l'étape 2 échoue (tables absentes).
2. `supabase/tapgoo_v4_upgrade.sql` — mise à niveau v4. À lancer **après** le
   schéma de base. Il ajoute la messagerie, les colonnes profil manquantes, la
   lecture publique des trajets actifs et les fonctions sécurisées.

Les deux scripts sont idempotents (relançables sans danger). Sur une base déjà
en service, relancer `tapgoo_schema.sql` applique aussi le correctif de sécurité
de la fonction `book_ride` (réservation impossible au nom d'un autre membre).

## 2. Variables d'environnement (Vercel → Settings → Environment Variables)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY  (pour enregistrer les messages de contact)
- RESEND_API_KEY             (optionnel, envoi d'email)
- CONTACT_TO / CONTACT_FROM  (optionnel)

## 3. Déploiement
- Pousser le code sur GitHub puis importer dans Vercel (ou `vercel deploy`).
- Tester sur mobile : la barre d'onglets en bas doit apparaître.

## 4. Ce qui a changé dans cette version
- Vraie page d'accueil avec recherche unifiée Trajet / Borne (la page de test a été supprimée)
- Navigation partagée : barre haute (desktop) + onglets bas (mobile)
- Identité TAPGOO : vert unique #00b868, typo Sora, signature « ligne de trajet »
- Messagerie fonctionnelle (conversations + envoi + bouton Contacter sur les trajets)
- Page Entreprises complète avec formulaire relié à /api/contact
- Dashboard enrichi : stats, CO2 évité (estimation), contact conducteur
- Vocabulaire conforme : « participation aux frais », mention L.3132-1 en footer
- Sécurité : suppression des console.log exposant la clé, API contact durcie
  (honeypot, limite de débit, validation email, longueurs maximales),
  policies RLS messagerie, RPC sécurisées (vérification auth.uid())
- next.config.ts en double supprimé (next.config.js conservé)

## 5. À tester après déploiement
1. Recherche d'un trajet depuis l'accueil sans être connecté → résultats visibles
   (nécessite l'exécution du SQL de l'étape 1, sinon liste vide pour les visiteurs)
2. Connexion Google → publication d'un trajet → réservation depuis un 2e compte
3. Bouton « Contacter » sur un trajet → conversation dans Messages
4. Formulaire Entreprises → réception dans contact_messages (et email si Resend configuré)
