-- Recording identity joins dated catalog metadata, private teaching notes and
-- redacted machine transcripts without renumbering the existing replay slots.
CREATE TABLE public.academy_recording_sources (
  video_id text PRIMARY KEY CHECK (video_id ~ '^[0-9]{1,20}$'),
  source_date date NOT NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  stage text NOT NULL CHECK (length(stage) BETWEEN 1 AND 200),
  summary text NOT NULL CHECK (length(summary) BETWEEN 1 AND 1000),
  skill text NOT NULL CHECK (length(skill) BETWEEN 1 AND 200),
  source_name text NOT NULL CHECK (length(source_name) BETWEEN 1 AND 200),
  source_vtt text NOT NULL CHECK (length(source_vtt) BETWEEN 20 AND 2000000),
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  cue_count integer NOT NULL CHECK (cue_count BETWEEN 1 AND 20000),
  notes jsonb NOT NULL CHECK (jsonb_typeof(notes) = 'array'),
  source_note text NOT NULL CHECK (length(source_note) BETWEEN 1 AND 2000),
  source_modified_at timestamptz NOT NULL,
  timing_basis text NOT NULL DEFAULT 'source_landmarks'
    CHECK (timing_basis IN ('source_landmarks', 'media')),
  active boolean NOT NULL DEFAULT true,
  imported_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_vtt LIKE 'WEBVTT%'),
  CHECK (source_sha256 = encode(extensions.digest(source_vtt, 'sha256'), 'hex'))
);

ALTER TABLE public.academy_recording_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.academy_recording_sources FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.academy_recording_sources TO service_role;

COMMENT ON TABLE public.academy_recording_sources IS
  'Private Accelerator teaching sources keyed to verified recording identity. Headlines may be served in the catalog; notes and transcript require existing lesson authorization. Source-clock timestamps are not verified player timestamps.';

NOTIFY pgrst, 'reload schema';
