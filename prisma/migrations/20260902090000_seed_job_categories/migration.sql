-- Seeds the eight activity sectors the landing page has always displayed.
--
-- Until now those sectors existed only as hardcoded keys in
-- src/translations.ts, while the JobCategory table sat empty — so the
-- "opportunités par domaine" grid could not report real job counts. These
-- rows make the database the single source of truth for which domains
-- exist; the frontend keeps the icon, photo and translated label keyed by
-- `slug`.
--
-- Idempotent: re-running is a no-op, so it is safe on an environment where
-- an operator already inserted some of these by hand.
INSERT INTO "JobCategory" (id, name, slug, description, icon, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Technologie & IT',          'it',           'Développement, data, réseaux et systèmes d''information.',        'Cpu',           now(), now()),
  (gen_random_uuid(), 'Santé & Médical',           'health',       'Soins, pharmacie, laboratoires et professions médicales.',        'HeartPulse',    now(), now()),
  (gen_random_uuid(), 'Finance & Banque',          'finance',      'Banque, assurance, comptabilité et contrôle de gestion.',         'Landmark',      now(), now()),
  (gen_random_uuid(), 'Construction & BTP',        'construction', 'Bâtiment, travaux publics, génie civil et architecture.',         'HardHat',       now(), now()),
  (gen_random_uuid(), 'Éducation',                 'education',    'Enseignement, formation professionnelle et recherche.',           'GraduationCap', now(), now()),
  (gen_random_uuid(), 'Tourisme & Hôtellerie',     'tourism',      'Hôtellerie, restauration, voyage et événementiel.',               'Palmtree',      now(), now()),
  (gen_random_uuid(), 'Industrie & Énergie',       'industry',     'Production, maintenance, énergie et logistique industrielle.',    'Factory',       now(), now()),
  (gen_random_uuid(), 'Commerce & Vente',          'commerce',     'Vente, distribution, marketing et relation client.',              'ShoppingBag',   now(), now())
ON CONFLICT (slug) DO NOTHING;
