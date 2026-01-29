-- ============================================
-- TABLE: relance_history
-- Historique complet de toutes les relances
-- ============================================
CREATE TABLE IF NOT EXISTS public.relance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
  relance_type TEXT NOT NULL CHECK (
    relance_type IN (
      'expert_portail',
      'expert_email',
      'client_sms',
      'client_email',
      'auto_stop'
    )
  ),
  type TEXT NOT NULL CHECK (
    type IN ('email', 'sms', 'portail_expert', 'appel', 'system')
  ),
  destinataire TEXT NOT NULL,
  sujet TEXT,
  contenu TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (
    statut IN ('en_attente', 'envoye', 'delivre', 'lu', 'echec', 'annule')
  ),
  statut_details JSONB DEFAULT '{}'::jsonb,
  site_expert_id UUID REFERENCES public.expert_sites(id) ON DELETE SET NULL,
  twilio_message_sid TEXT,
  resend_email_id TEXT,
  portail_action TEXT CHECK (
    portail_action IN ('connexion', 'recherche', 'message_envoye', 'rapport_telecharge')
  ),
  portail_resultat JSONB,
  erreur_message TEXT,
  sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_relance_history_dossier ON public.relance_history(dossier_id);
CREATE INDEX IF NOT EXISTS idx_relance_history_sent_at ON public.relance_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_relance_history_relance_type ON public.relance_history(relance_type);
CREATE INDEX IF NOT EXISTS idx_relance_history_statut ON public.relance_history(statut);
CREATE INDEX IF NOT EXISTS idx_relance_history_dossier_sent ON public.relance_history(dossier_id, sent_at);

-- RLS Policies
ALTER TABLE public.relance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view relance history" ON public.relance_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert relance history" ON public.relance_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
