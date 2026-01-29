INSERT INTO public.settings (key, value, description) VALUES
  ('frequence_relance_assurance_mois', '2', 'Fréquence des relances assurances (en mois)'),
  ('relance_assurance_auto_enabled', 'true', 'Activer la relance automatique des assurances'),
  ('modele_message_assurance', 'Bonjour, nous relançons concernant la facture {numero_facture} d''un montant de {montant}€ pour le dossier {dossier_id}. Merci de procéder au règlement. Cordialement.', 'Modèle de message pour relance assurance'),
  ('assurance_email_expediteur', '', 'Email expéditeur pour relances assurances')
ON CONFLICT (key) DO NOTHING;
