-- ============================================
-- SEEDS DE DONNÉES POUR TESTS
-- ============================================

-- Note: Les users doivent être créés via Supabase Auth d'abord
-- Ce script suppose que vous avez créé des users avec des UUIDs spécifiques

-- Exemple de clients
INSERT INTO public.clients (id, nom, telephone, email, adresse) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dupont Jean', '0612345678', 'jean.dupont@example.com', '123 Rue de la Paix, 75001 Paris'),
  ('00000000-0000-0000-0000-000000000002', 'Martin Sophie', '0698765432', 'sophie.martin@example.com', '456 Avenue des Champs, 69000 Lyon'),
  ('00000000-0000-0000-0000-000000000003', 'Bernard Pierre', '0611121314', 'pierre.bernard@example.com', '789 Boulevard Saint-Michel, 13000 Marseille')
ON CONFLICT DO NOTHING;

-- Exemple de véhicules
INSERT INTO public.vehicules (id, immatriculation, vin, marque, modele, annee) VALUES
  ('10000000-0000-0000-0000-000000000001', 'AB-123-CD', 'WVWZZZ1KZCW123456', 'Volkswagen', 'Golf', 2020),
  ('10000000-0000-0000-0000-000000000002', 'EF-456-GH', 'WBA3A5C58EK123789', 'BMW', 'Série 3', 2021),
  ('10000000-0000-0000-0000-000000000003', 'IJ-789-KL', 'VF7RFRF8F12345678', 'Renault', 'Clio', 2019)
ON CONFLICT DO NOTHING;

-- Exemple de fournisseurs
INSERT INTO public.suppliers (id, nom, contact, telephone, email, site_web, notes) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Pièces Auto Pro', 'M. Durand', '0145678901', 'contact@piecesautopro.fr', 'https://piecesautopro.fr', 'Fournisseur principal, bon délai'),
  ('20000000-0000-0000-0000-000000000002', 'Carrosserie Express', 'Mme. Leroy', '0145678902', 'info@carrosserie-express.fr', 'https://carrosserie-express.fr', 'Spécialisé pièces carrosserie'),
  ('20000000-0000-0000-0000-000000000003', 'OEM Parts Direct', 'Service Client', '0145678903', 'service@oemparts.fr', 'https://oemparts.fr', 'Pièces d''origine, prix élevés mais qualité')
ON CONFLICT DO NOTHING;

-- Exemple de dossiers (nécessite des users créés via Auth)
-- Remplacez les UUIDs created_by par vos vrais UUIDs d'users
INSERT INTO public.dossiers (
  id, dossier_id, client_id, vehicule_id, assureur, expert, expert_email,
  statut, montant_estime, date_entree, notifier_client
) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    'DOS-2024-001',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'AXA',
    'Expert Martin',
    'expert.martin@axa.fr',
    'EN_ATTENTE_EXPERT',
    2500.00,
    NOW() - INTERVAL '10 days',
    true
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'DOS-2024-002',
    '00000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'Allianz',
    'Expert Dubois',
    'expert.dubois@allianz.fr',
    'RAPPORT_RECU',
    4500.00,
    NOW() - INTERVAL '5 days',
    false
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'DOS-2024-003',
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    'Groupama',
    'Expert Petit',
    'expert.petit@groupama.fr',
    'FACTURE_ENVOYEE',
    1800.00,
    NOW() - INTERVAL '35 days',
    true
  )
ON CONFLICT DO NOTHING;

-- Exemple de checklist items
INSERT INTO public.checklist_items (dossier_id, libelle, est_obligatoire, document_requis) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Carte grise reçue', true, 'carte_grise'),
  ('30000000-0000-0000-0000-000000000001', 'Photos avant réparation', true, 'photos_avant'),
  ('30000000-0000-0000-0000-000000000001', 'Rapport expert reçu', true, 'rapport_expert'),
  ('30000000-0000-0000-0000-000000000001', 'Devis validé', false, 'devis'),
  ('30000000-0000-0000-0000-000000000002', 'Carte grise reçue', true, 'carte_grise'),
  ('30000000-0000-0000-0000-000000000002', 'Rapport expert reçu', true, 'rapport_expert'),
  ('30000000-0000-0000-0000-000000000002', 'Photos avant réparation', true, 'photos_avant')
ON CONFLICT DO NOTHING;

-- Exemple de communications
INSERT INTO public.communications (dossier_id, type, destinataire, sujet, contenu, statut) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    'relance_auto',
    'expert.martin@axa.fr',
    'Relance - Dossier DOS-2024-001',
    'Bonjour, nous relançons concernant le dossier DOS-2024-001. Merci de nous faire parvenir le rapport d''expertise au plus vite.',
    'envoye'
  ),
  (
    '30000000-0000-0000-0000-000000000001',
    'email',
    'jean.dupont@example.com',
    'Mise à jour dossier DOS-2024-001',
    'Bonjour, nous avons relancé l''expert concernant votre dossier DOS-2024-001 aujourd''hui. Nous vous tiendrons informé dès réception du rapport.',
    'envoye'
  )
ON CONFLICT DO NOTHING;

-- Exemple de payments
INSERT INTO public.payments (
  dossier_id, montant, date_facture, date_echeance, statut,
  nombre_relances, email_paiements
) VALUES
  (
    '30000000-0000-0000-0000-000000000003',
    1800.00,
    NOW() - INTERVAL '35 days',
    NOW() - INTERVAL '5 days',
    'EN_RETARD',
    2,
    'paiements@carrosserie.local'
  )
ON CONFLICT DO NOTHING;
