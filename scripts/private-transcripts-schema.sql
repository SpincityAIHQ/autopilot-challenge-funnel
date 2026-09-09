BEGIN;

-- Paid transcript text stays in the database and is only read by the server
-- after its lesson entitlement check. Source files never enter the public repo.
CREATE TABLE IF NOT EXISTS public.academy_transcripts (
  lesson_id text PRIMARY KEY CHECK (lesson_id ~ '^[a-z0-9-]{1,80}$'),
  media_version text NOT NULL CHECK (length(media_version) BETWEEN 1 AND 64),
  source_name text NOT NULL CHECK (length(source_name) BETWEEN 1 AND 200),
  source_vtt text NOT NULL CHECK (length(source_vtt) BETWEEN 20 AND 2000000),
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  cue_count integer NOT NULL CHECK (cue_count BETWEEN 1 AND 20000),
  active boolean NOT NULL DEFAULT true,
  imported_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_vtt LIKE 'WEBVTT%'),
  CHECK (source_sha256 = encode(extensions.digest(source_vtt, 'sha256'), 'hex'))
);

ALTER TABLE public.academy_transcripts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.academy_transcripts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.academy_transcripts TO service_role;

COMMENT ON TABLE public.academy_transcripts IS
  'Private, version-bound recording transcripts. Server reads only; operator imports validated files. No client policies or grants.';

NOTIFY pgrst, 'reload schema';
COMMIT;
