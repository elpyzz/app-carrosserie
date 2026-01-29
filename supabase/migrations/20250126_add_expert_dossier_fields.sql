-- ============================================
-- MIGRATION: Ajout champs pour dossiers Expert
-- Date: 2025-01-26
-- Description: Ajoute numero_sinistre, numero_client et site_expert_id pour le scraping
-- ============================================

-- 1. Ajouter numero_client dans la table clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS numero_client TEXT;

-- Index pour recherche rapide par numero_client
CREATE INDEX IF NOT EXISTS idx_clients_numero_client 
ON public.clients(numero_client);

-- 2. Ajouter numero_sinistre dans la table dossiers
ALTER TABLE public.dossiers 
ADD COLUMN IF NOT EXISTS numero_sinistre TEXT;

-- Index pour recherche rapide par numero_sinistre
CREATE INDEX IF NOT EXISTS idx_dossiers_numero_sinistre 
ON public.dossiers(numero_sinistre);

-- 3. Ajouter site_expert_id dans la table dossiers (référence à expert_sites)
-- Note: ON DELETE SET NULL pour ne pas perdre le dossier si le site est supprimé
ALTER TABLE public.dossiers 
ADD COLUMN IF NOT EXISTS site_expert_id UUID REFERENCES public.expert_sites(id) ON DELETE SET NULL;

-- Index pour jointures rapides
CREATE INDEX IF NOT EXISTS idx_dossiers_site_expert_id 
ON public.dossiers(site_expert_id);

-- 4. Index composite pour le scraper (recherche par site + sinistre)
CREATE INDEX IF NOT EXISTS idx_dossiers_scraper_lookup 
ON public.dossiers(site_expert_id, numero_sinistre) 
WHERE numero_sinistre IS NOT NULL;
