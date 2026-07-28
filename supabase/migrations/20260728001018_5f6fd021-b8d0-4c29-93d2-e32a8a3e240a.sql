CREATE TABLE public.summit_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  business_type text,
  revenue_stage text,
  bottleneck text,
  what_stops text,
  ai_tools text[],
  team_size text,
  attendance text,
  top_question text,
  autonomy_goal text,
  anything_else text,
  entitlement_tier text
);

CREATE UNIQUE INDEX summit_audit_email_key ON public.summit_audit ((lower(email)));
CREATE INDEX summit_audit_created_at_idx ON public.summit_audit (created_at DESC);

-- Least privilege: only service_role writes/reads. No anon, no authenticated.
GRANT SELECT, INSERT, UPDATE ON public.summit_audit TO service_role;

ALTER TABLE public.summit_audit ENABLE ROW LEVEL SECURITY;

-- No policies granted to anon or authenticated: default-deny for the Data API.
-- service_role bypasses RLS and is used from the public API route only.

CREATE TRIGGER update_summit_audit_updated_at
  BEFORE UPDATE ON public.summit_audit
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();