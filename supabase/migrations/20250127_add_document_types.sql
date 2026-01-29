-- ============================================
-- MIGRATION: Ajout types de documents pv et reglement_direct
-- Date: 2025-01-27
-- Description: Ajoute les types 'pv' et 'reglement_direct' à la table documents
-- ============================================

-- Ajouter les types 'pv' et 'reglement_direct' si absents
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE public.documents 
ADD CONSTRAINT documents_type_check CHECK (
  type IN (
    'devis',
    'photos_avant',
    'photos_apres',
    'carte_grise',
    'rapport_expert',
    'pv',
    'reglement_direct',
    'facture',
    'autres'
  )
);
