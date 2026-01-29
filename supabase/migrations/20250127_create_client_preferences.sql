-- ============================================
-- TABLE: client_preferences
-- Préférences de communication des clients
-- ============================================
CREATE TABLE IF NOT EXISTS public.client_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE NOT NULL,
  sms_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  opt_out_sms_at TIMESTAMPTZ,
  opt_out_email_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_client_preferences_client ON public.client_preferences(client_id);

-- RLS Policies
ALTER TABLE public.client_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view client preferences" ON public.client_preferences
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update client preferences" ON public.client_preferences
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert client preferences" ON public.client_preferences
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
