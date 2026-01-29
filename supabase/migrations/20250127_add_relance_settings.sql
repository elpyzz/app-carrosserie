-- ============================================
-- MIGRATION: Ajout settings pour système de relance
-- Date: 2025-01-27
-- Description: Ajoute les nouveaux settings pour relances expert et client
-- ============================================

-- Mettre à jour la fréquence de relance expert à 2 jours
UPDATE public.settings 
SET value = '2' 
WHERE key = 'frequence_relance_expert_jours';

-- Ajouter les nouveaux settings
INSERT INTO public.settings (key, value, description) VALUES
  ('frequence_relance_client_jours', '2', 'Fréquence des relances clients (en jours)'),
  ('relance_expert_portail_enabled', 'true', 'Activer la relance expert via portail web'),
  ('relance_client_sms_enabled', 'true', 'Activer la relance client par SMS'),
  ('modele_message_client_sms', 'Bonjour {client_nom}, nous avons relancé l''expert concernant votre dossier {dossier_id} aujourd''hui. Nous vous tiendrons informé dès réception du rapport. Cordialement.', 'Modèle de message SMS pour relance client'),
  ('modele_message_expert_portail', 'Bonjour, nous relançons concernant le dossier {dossier_id}. Merci de nous faire parvenir le rapport d''expertise au plus vite.', 'Modèle de message pour relance expert via portail'),
  ('twilio_account_sid', '', 'Twilio Account SID'),
  ('twilio_auth_token', '', 'Twilio Auth Token'),
  ('twilio_phone_number', '', 'Numéro téléphone Twilio expéditeur'),
  ('relance_max_retries', '3', 'Nombre maximum de tentatives de relance avant abandon'),
  ('relance_retry_delay_minutes', '60', 'Délai entre tentatives de relance (en minutes)')
ON CONFLICT (key) DO NOTHING;
