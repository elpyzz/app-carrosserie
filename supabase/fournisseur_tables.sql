-- ============================================
-- TABLES POUR L'ONGLET FOURNISSEUR
-- ============================================

-- Table: supplier_sites (max 6 sites)
CREATE TABLE IF NOT EXISTS public.supplier_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  url_recherche TEXT NOT NULL,
  type_auth TEXT NOT NULL DEFAULT 'none' CHECK (type_auth IN ('none', 'form', 'api')),
  credentials JSONB,
  selectors JSONB,
  actif BOOLEAN DEFAULT true,
  ordre INTEGER CHECK (ordre >= 1 AND ordre <= 6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to enforce max 6 active sites
CREATE OR REPLACE FUNCTION public.check_max_6_active_sites()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Count active sites, excluding current row if it's an update
  IF TG_OP = 'UPDATE' THEN
    -- For UPDATE: count active sites excluding the current row
    SELECT COUNT(*) INTO active_count
    FROM public.supplier_sites
    WHERE actif = true AND id != NEW.id;
  ELSE
    -- For INSERT: count all active sites
    SELECT COUNT(*) INTO active_count
    FROM public.supplier_sites
    WHERE actif = true;
  END IF;
  
  -- If the new/updated row is active, add 1 to the count
  IF NEW.actif = true THEN
    active_count := active_count + 1;
  END IF;
  
  -- Check if we exceed the limit
  IF active_count > 6 THEN
    RAISE EXCEPTION 'Maximum de 6 sites actifs autorisés. Actuellement: % sites actifs', active_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce max 6 active sites
DROP TRIGGER IF EXISTS trigger_check_max_6_active_sites ON public.supplier_sites;
CREATE TRIGGER trigger_check_max_6_active_sites
  BEFORE INSERT OR UPDATE ON public.supplier_sites
  FOR EACH ROW
  EXECUTE FUNCTION public.check_max_6_active_sites();

-- Table: piece_searches
CREATE TABLE IF NOT EXISTS public.piece_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE SET NULL,
  reference_piece TEXT,
  marque TEXT,
  modele TEXT,
  annee INTEGER,
  nom_piece TEXT,
  sites_interroges TEXT[],
  resultats JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: piece_results
CREATE TABLE IF NOT EXISTS public.piece_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID REFERENCES public.piece_searches(id) ON DELETE CASCADE,
  supplier_site_id UUID REFERENCES public.supplier_sites(id) ON DELETE SET NULL,
  reference TEXT,
  nom TEXT,
  prix DECIMAL(10, 2),
  devise TEXT DEFAULT 'EUR',
  disponibilite TEXT CHECK (disponibilite IN ('en_stock', 'sur_commande', 'indisponible')),
  delai_jours INTEGER,
  image_url TEXT,
  produit_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_piece_searches_dossier ON public.piece_searches(dossier_id);
CREATE INDEX IF NOT EXISTS idx_piece_searches_reference ON public.piece_searches(reference_piece);
CREATE INDEX IF NOT EXISTS idx_piece_searches_created ON public.piece_searches(created_at);
CREATE INDEX IF NOT EXISTS idx_piece_results_search ON public.piece_results(search_id);
CREATE INDEX IF NOT EXISTS idx_piece_results_supplier ON public.piece_results(supplier_site_id);
CREATE INDEX IF NOT EXISTS idx_supplier_sites_ordre ON public.supplier_sites(ordre);

-- RLS Policies
ALTER TABLE public.supplier_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piece_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piece_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view supplier sites" ON public.supplier_sites
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify supplier sites" ON public.supplier_sites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view piece searches" ON public.piece_searches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert piece searches" ON public.piece_searches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view piece results" ON public.piece_results
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert piece results" ON public.piece_results
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
