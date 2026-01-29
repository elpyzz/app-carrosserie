-- ============================================
-- TABLE: factures_assurance
-- Factures impayées uploadées pour relance automatique
-- ============================================
CREATE TABLE IF NOT EXISTS public.factures_assurance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE SET NULL,
  nom_assurance TEXT NOT NULL,
  email_assurance TEXT NOT NULL DEFAULT '',
  telephone_assurance TEXT,
  montant DECIMAL(10, 2) NOT NULL,
  numero_facture TEXT,
  date_facture TIMESTAMPTZ,
  date_echeance TIMESTAMPTZ,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  statut TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (
    statut IN ('EN_ATTENTE', 'RELANCE_EN_COURS', 'SUPPRIME')
  ),
  donnees_extractees JSONB DEFAULT '{}'::jsonb,
  date_derniere_relance TIMESTAMPTZ,
  nombre_relances INTEGER DEFAULT 0,
  prochaine_relance TIMESTAMPTZ,
  notes TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_factures_assurance_statut 
  ON public.factures_assurance(statut);
CREATE INDEX IF NOT EXISTS idx_factures_assurance_prochaine_relance 
  ON public.factures_assurance(prochaine_relance) 
  WHERE statut IN ('EN_ATTENTE', 'RELANCE_EN_COURS');
CREATE INDEX IF NOT EXISTS idx_factures_assurance_dossier 
  ON public.factures_assurance(dossier_id);
CREATE INDEX IF NOT EXISTS idx_factures_assurance_assurance 
  ON public.factures_assurance(nom_assurance);
CREATE INDEX IF NOT EXISTS idx_factures_assurance_email 
  ON public.factures_assurance(email_assurance) 
  WHERE email_assurance != '';

-- RLS Policies
ALTER TABLE public.factures_assurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view factures assurance" 
  ON public.factures_assurance
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert factures assurance" 
  ON public.factures_assurance
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update factures assurance" 
  ON public.factures_assurance
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete factures assurance" 
  ON public.factures_assurance
  FOR DELETE USING (auth.role() = 'authenticated');
