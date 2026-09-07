CREATE TABLE public.training_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  source TEXT,
  attribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  email_marketing_consent BOOLEAN NOT NULL DEFAULT false,
  email_marketing_consent_at TIMESTAMP WITH TIME ZONE,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX training_waitlist_email_key ON public.training_waitlist (lower(email));
GRANT SELECT, INSERT, UPDATE ON public.training_waitlist TO service_role;
ALTER TABLE public.training_waitlist ENABLE ROW LEVEL SECURITY;