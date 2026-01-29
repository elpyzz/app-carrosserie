ALTER TABLE public.relance_history 
DROP CONSTRAINT IF EXISTS relance_history_relance_type_check;

ALTER TABLE public.relance_history 
ADD CONSTRAINT relance_history_relance_type_check CHECK (
  relance_type IN (
    'expert_portail',
    'expert_email',
    'client_sms',
    'client_email',
    'assurance_email',
    'auto_stop'
  )
);
