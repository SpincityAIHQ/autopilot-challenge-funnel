-- ALREADY APPLIED by the owner directly. Kept for reference; safe to re-run.
-- Vault skill packages (.zip) and download audit. Package contents live ONLY in
-- the database — never commit skill contents, zip data or overview text.
-- Rows are hidden until published = true. Service role only.
BEGIN;
CREATE TABLE IF NOT EXISTS public.vault_skill_packages (
  slug text PRIMARY KEY,
  name text NOT NULL,
  preview text NOT NULL,
  overview jsonb NOT NULL DEFAULT '[]'::jsonb,
  access text NOT NULL DEFAULT 'vault' CHECK (access IN ('vip', 'vault')),
  linked_resource_slug text,
  is_bundle boolean NOT NULL DEFAULT false,
  version text NOT NULL,
  file_name text NOT NULL,
  byte_size integer NOT NULL,
  sha256 text NOT NULL,
  zip_base64 text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.vault_skill_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL REFERENCES public.vault_skill_packages(slug),
  version text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vault_skill_downloads_user_time
  ON public.vault_skill_downloads(user_id, created_at);
ALTER TABLE public.vault_skill_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_skill_downloads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vault_skill_packages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.vault_skill_downloads FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_skill_packages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_skill_downloads TO service_role;
COMMIT;
