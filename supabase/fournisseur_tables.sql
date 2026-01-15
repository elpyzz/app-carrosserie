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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT max_6_sites CHECK (
    (SELECT COUNT(*) FROM public.supplier_sites WHERE actif = true) <= 6
  )
);

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
