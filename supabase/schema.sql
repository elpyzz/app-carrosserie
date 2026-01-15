-- ============================================
-- SCHEMA SUPABASE - APP CARROSSERIE
-- ============================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users (étend la table auth.users de Supabase)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employe')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: clients
-- ============================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  adresse TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: vehicules
-- ============================================
CREATE TABLE IF NOT EXISTS public.vehicules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  immatriculation TEXT,
  vin TEXT,
  marque TEXT,
  modele TEXT,
  annee INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: dossiers (entité centrale)
-- ============================================
CREATE TABLE IF NOT EXISTS public.dossiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id TEXT UNIQUE NOT NULL, -- Ex: DOS-2024-001
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  vehicule_id UUID REFERENCES public.vehicules(id) ON DELETE SET NULL,
  assureur TEXT,
  expert TEXT,
  expert_email TEXT,
  statut TEXT NOT NULL DEFAULT 'NOUVEAU' CHECK (
    statut IN (
      'NOUVEAU',
      'EN_ATTENTE_EXPERT',
      'RELANCE_EXPERT',
      'RAPPORT_RECU',
      'EN_REPARATION',
      'FACTURE_ENVOYEE',
      'EN_ATTENTE_PAIEMENT',
      'PAYE',
      'LITIGE'
    )
  ),
  montant_estime DECIMAL(10, 2),
  notes TEXT,
  date_entree TIMESTAMPTZ DEFAULT NOW(),
  date_derniere_relance_expert TIMESTAMPTZ,
  date_rapport_recu TIMESTAMPTZ,
  date_facture_envoyee TIMESTAMPTZ,
  notifier_client BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: documents
-- ============================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'devis',
      'photos_avant',
      'photos_apres',
      'carte_grise',
      'rapport_expert',
      'facture',
      'autres'
    )
  ),
  nom_fichier TEXT NOT NULL,
  chemin_storage TEXT NOT NULL, -- Chemin dans Supabase Storage
  taille_bytes BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: checklist_items
-- ============================================
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL,
  est_obligatoire BOOLEAN DEFAULT false,
  est_coche BOOLEAN DEFAULT false,
  document_requis TEXT, -- Type de document requis pour valider
  checked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: communications
-- ============================================
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'appel', 'relance_auto')),
  destinataire TEXT NOT NULL, -- Email ou téléphone
  sujet TEXT,
  contenu TEXT,
  statut TEXT DEFAULT 'envoye' CHECK (statut IN ('envoye', 'lu', 'erreur')),
  thread_id TEXT, -- Pour suivre les threads email
  sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: payments
-- ============================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
  montant DECIMAL(10, 2) NOT NULL,
  date_facture TIMESTAMPTZ,
  date_echeance TIMESTAMPTZ,
  statut TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (
    statut IN ('EN_ATTENTE', 'PAYE', 'EN_RETARD', 'LITIGE')
  ),
  date_derniere_relance TIMESTAMPTZ,
  nombre_relances INTEGER DEFAULT 0,
  email_paiements TEXT, -- Email dédié pour suivre les paiements
  thread_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: suppliers
-- ============================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  contact TEXT,
  telephone TEXT,
  email TEXT,
  site_web TEXT,
  notes TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: supplier_searches
-- ============================================
CREATE TABLE IF NOT EXISTS public.supplier_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE SET NULL,
  vehicule_marque TEXT,
  vehicule_modele TEXT,
  piece TEXT NOT NULL,
  reference TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  prix DECIMAL(10, 2),
  delai_jours INTEGER,
  disponible BOOLEAN,
  notes TEXT,
  searched_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: audit_logs
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL, -- Ex: 'DOSSIER_CREATED', 'STATUT_CHANGED', 'DOCUMENT_UPLOADED'
  entity_type TEXT NOT NULL, -- Ex: 'dossier', 'document', 'payment'
  entity_id UUID,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: settings
-- ============================================
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES pour performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_dossiers_statut ON public.dossiers(statut);
CREATE INDEX IF NOT EXISTS idx_dossiers_client ON public.dossiers(client_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_dossier_id ON public.dossiers(dossier_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_date_entree ON public.dossiers(date_entree);
CREATE INDEX IF NOT EXISTS idx_documents_dossier ON public.documents(dossier_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);
CREATE INDEX IF NOT EXISTS idx_communications_dossier ON public.communications(dossier_id);
CREATE INDEX IF NOT EXISTS idx_communications_sent_at ON public.communications(sent_at);
CREATE INDEX IF NOT EXISTS idx_payments_statut ON public.payments(statut);
CREATE INDEX IF NOT EXISTS idx_payments_dossier ON public.payments(dossier_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: users
-- ============================================
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- POLICIES: clients
-- ============================================
CREATE POLICY "Authenticated users can view all clients" ON public.clients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert clients" ON public.clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- POLICIES: vehicules
-- ============================================
CREATE POLICY "Authenticated users can view all vehicules" ON public.vehicules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert vehicules" ON public.vehicules
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update vehicules" ON public.vehicules
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- POLICIES: dossiers
-- ============================================
CREATE POLICY "Authenticated users can view all dossiers" ON public.dossiers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert dossiers" ON public.dossiers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update dossiers" ON public.dossiers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- POLICIES: documents
-- ============================================
CREATE POLICY "Authenticated users can view all documents" ON public.documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert documents" ON public.documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete documents" ON public.documents
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- POLICIES: checklist_items
-- ============================================
CREATE POLICY "Authenticated users can view all checklist items" ON public.checklist_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert checklist items" ON public.checklist_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update checklist items" ON public.checklist_items
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- POLICIES: communications
-- ============================================
CREATE POLICY "Authenticated users can view all communications" ON public.communications
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert communications" ON public.communications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- POLICIES: payments
-- ============================================
CREATE POLICY "Authenticated users can view all payments" ON public.payments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert payments" ON public.payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update payments" ON public.payments
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- POLICIES: suppliers
-- ============================================
CREATE POLICY "Authenticated users can view all suppliers" ON public.suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update suppliers" ON public.suppliers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- POLICIES: supplier_searches
-- ============================================
CREATE POLICY "Authenticated users can view all supplier searches" ON public.supplier_searches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert supplier searches" ON public.supplier_searches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- POLICIES: audit_logs
-- ============================================
CREATE POLICY "Authenticated users can view all audit logs" ON public.audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- POLICIES: settings
-- ============================================
CREATE POLICY "Authenticated users can view settings" ON public.settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update settings" ON public.settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- FUNCTIONS: Génération automatique dossier_id
-- ============================================
CREATE OR REPLACE FUNCTION generate_dossier_id()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_id TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Trouver le dernier numéro de séquence pour cette année
  SELECT COALESCE(MAX(CAST(SUBSTRING(dossier_id FROM '\d+$') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.dossiers
  WHERE dossier_id LIKE 'DOS-' || year_part || '-%';
  
  new_id := 'DOS-' || year_part || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTIONS: Audit log automatique
-- ============================================
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details)
  VALUES (
    TG_OP || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers pour audit automatique sur tables importantes
CREATE TRIGGER audit_dossiers AFTER INSERT OR UPDATE OR DELETE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ============================================
-- SEEDS: Settings par défaut
-- ============================================
INSERT INTO public.settings (key, value, description) VALUES
  ('email_expediteur', 'noreply@carrosserie.local', 'Email expéditeur pour les communications'),
  ('email_paiements', 'paiements@carrosserie.local', 'Email dédié pour suivre les paiements'),
  ('frequence_relance_expert_jours', '3', 'Fréquence des relances experts (en jours)'),
  ('delai_alerte_rapport_jours', '15', 'Délai avant alerte si rapport expert manquant (en jours)'),
  ('sms_enabled', 'false', 'Activer les SMS via Twilio'),
  ('modele_message_expert', 'Bonjour, nous relançons concernant le dossier {dossier_id}. Merci de nous faire parvenir le rapport d''expertise au plus vite.', 'Modèle de message pour relance expert'),
  ('modele_message_client', 'Bonjour, nous avons relancé l''expert concernant votre dossier {dossier_id} aujourd''hui. Nous vous tiendrons informé dès réception du rapport.', 'Modèle de message pour notification client'),
  ('modele_message_impaye', 'Bonjour, votre facture {dossier_id} d''un montant de {montant}€ est en attente de paiement depuis {jours} jours. Merci de régulariser votre situation.', 'Modèle de message pour relance impayé')
ON CONFLICT (key) DO NOTHING;
