-- ============================================================
-- 0009 — Privilèges de table pour les rôles Supabase
-- IMPORTANT : la RLS ne fait que RESTREINDRE l'accès ; encore faut-il que le
-- rôle ait le privilège de base. On accorde des privilèges larges et on laisse
-- la RLS (activée sur toutes les tables) filtrer finement les lignes.
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

-- Tables existantes
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;            -- RLS limite aux lignes publiques
grant all on all tables in schema public to service_role;       -- côté serveur (BYPASSRLS)
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Futures tables/séquences/fonctions (créées par le rôle courant lors des
-- prochaines migrations) : mêmes privilèges par défaut.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
