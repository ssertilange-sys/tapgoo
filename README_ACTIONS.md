# TAPGOO V3 clean

Version propre et corrigée : design clair, pastilles voiture/recharge/entreprise, routes complètes, Auth Google centralisée, SQL corrigé.

## Installation

```bash
npm install
npm run dev
```

Copier `.env.example` vers `.env.local` puis mettre vos clés Supabase.

## Supabase

Exécuter `supabase/tapgoo_schema.sql` dans Supabase SQL Editor.

## Auth Google

Supabase > Authentication > Providers > Google : Enabled.

URL Configuration local :

```txt
Site URL: http://localhost:3000
Redirect URLs: http://localhost:3000/**
```
