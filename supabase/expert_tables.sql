-- ============================================
-- TABLES POUR L'ONGLET EXPERT
-- ============================================

-- Table: expert_sites
CREATE TABLE IF NOT EXISTS public.expert_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  url_recherche TEXT NOT NULL,
  type_auth TEXT NOT NULL DEFAULT 'none' CHECK (type_auth IN ('none', 'form', 'api')),
  credentials JSONB,
  selectors JSONB,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: expert_searches
CREATE TABLE IF NOT EXISTS public.expert_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE SET NULL,
  numero_dossier TEXT,
  immatriculation TEXT,
  date_sinistre DATE,
  sites_interroges TEXT[],
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (
    statut IN ('en_cours', 'trouve', 'non_trouve', 'erreur')
  ),
  resultats JSONB DEFAULT '[]'::jsonb,
  rapport_pdf_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expert_searches_dossier ON public.expert_searches(dossier_id);
CREATE INDEX IF NOT EXISTS idx_expert_searches_numero ON public.expert_searches(numero_dossier);
CREATE INDEX IF NOT EXISTS idx_expert_searches_immat ON public.expert_searches(immatriculation);
CREATE INDEX IF NOT EXISTS idx_expert_searches_statut ON public.expert_searches(statut);
CREATE INDEX IF NOT EXISTS idx_expert_searches_created ON public.expert_searches(created_at);

-- RLS Policies
ALTER TABLE public.expert_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view expert sites" ON public.expert_sites
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify expert sites" ON public.expert_sites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view expert searches" ON public.expert_searches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert expert searches" ON public.expert_searches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update expert searches" ON public.expert_searches
  FOR UPDATE USING (auth.role() = 'authenticated');
