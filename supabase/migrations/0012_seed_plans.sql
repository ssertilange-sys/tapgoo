-- ============================================================
-- 0012 — Seed des offres (plans). Prix indicatifs (dossier §5.2), à ajuster.
-- price_cents_monthly = prix mensuel en centimes (0 = gratuit / sur devis).
-- ============================================================

insert into public.plans (code, name, target, price_cents_monthly, features, active) values
  ('free_citizen', 'Free Citoyen',        'citizen',        0,     '{"search":true,"publish_limited":true,"communities":true}'::jsonb, true),
  ('plus',         'TAPGOO Plus',          'citizen',        399,   '{"alerts":true,"history":true,"advanced_filters":true,"proofs":true}'::jsonb, true),
  ('host',         'TAPGOO Hôte',          'host',           699,   '{"unlimited_publish":true,"visibility":true,"stats":true}'::jsonb, true),
  ('commerce',     'Commerce Local',       'commerce',       2900,  '{"local_page":true,"resources":true,"bookings":true}'::jsonb, true),
  ('association',  'Association',          'association',    0,     '{"solidarity":true,"impact_proofs":true}'::jsonb, true),
  ('ent_starter',  'Entreprise Starter',   'company',        14900, '{"community":true,"carpool":true,"fmd_simple":true,"dashboard":true}'::jsonb, true),
  ('ent_business', 'Entreprise Business',  'company',        39900, '{"fmd":true,"payroll":true,"parking":true,"charging":true,"rse":true,"multi_site":true}'::jsonb, true),
  ('enterprise',   'Enterprise',           'company',        0,     '{"sso":true,"api":true,"dpa":true,"audit":true,"bi":true}'::jsonb, true),
  ('territory',    'Territoire',           'collectivity',   0,     '{"portal":true,"lines":true,"solidarity":true,"public_indicators":true}'::jsonb, true)
on conflict (code) do nothing;
