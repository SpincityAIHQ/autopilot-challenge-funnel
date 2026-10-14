-- An available notes source must not masquerade as a spoken transcript.
ALTER TABLE public.academy_recording_sources
  ALTER COLUMN source_vtt DROP NOT NULL,
  ALTER COLUMN source_sha256 DROP NOT NULL,
  DROP CONSTRAINT academy_recording_sources_cue_count_check,
  ADD CONSTRAINT academy_recording_sources_cue_count_check
    CHECK (cue_count BETWEEN 0 AND 20000),
  ADD CONSTRAINT academy_recording_sources_transcript_pair_check
    CHECK (
      (source_vtt IS NULL AND source_sha256 IS NULL AND cue_count = 0)
      OR
      (source_vtt IS NOT NULL AND source_sha256 IS NOT NULL AND cue_count > 0)
    );

NOTIFY pgrst, 'reload schema';
