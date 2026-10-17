-- Atomically create a public Summit reservation and its channel-separated
-- consent evidence. This prevents a reservation from being accepted if its
-- explicit consent/decline state cannot be recorded.
ALTER TABLE public.marketing_consents
  ADD COLUMN IF NOT EXISTS reservation_id uuid
  REFERENCES public.summit_reservations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS marketing_consents_reservation_id_idx
  ON public.marketing_consents (reservation_id);

CREATE OR REPLACE FUNCTION public.create_summit_reservation_with_consents(
  _token text,
  _first_name text,
  _email text,
  _phone text,
  _email_granted boolean,
  _sms_granted boolean,
  _ai_call_granted boolean,
  _ai_call_signer_name text,
  _source text,
  _source_route text,
  _copy_version text,
  _email_consent_text text,
  _sms_consent_text text,
  _ai_call_consent_text text,
  _seller text,
  _request_hash text,
  _user_agent_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  captured_at timestamptz := statement_timestamp();
  created_reservation_id uuid;
BEGIN
  IF _token IS NULL OR char_length(_token) <> 32 THEN
    RAISE EXCEPTION 'valid reservation token required' USING ERRCODE = '22023';
  END IF;
  IF _email IS NULL OR length(trim(_email)) = 0 THEN
    RAISE EXCEPTION 'email required' USING ERRCODE = '22023';
  END IF;
  IF _phone IS NULL OR length(trim(_phone)) < 6 THEN
    RAISE EXCEPTION 'phone required' USING ERRCODE = '22023';
  END IF;
  IF _ai_call_granted AND
     (_ai_call_signer_name IS NULL OR length(trim(_ai_call_signer_name)) < 2) THEN
    RAISE EXCEPTION 'AI-call signature required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.summit_reservations (
    token,
    first_name,
    email,
    phone,
    tier_reserved,
    settled
  ) VALUES (
    _token,
    _first_name,
    lower(trim(_email)),
    trim(_phone),
    'ga',
    false
  )
  RETURNING id INTO created_reservation_id;

  INSERT INTO public.marketing_consents (
    reservation_id,
    subject_email,
    channel,
    granted,
    granted_at,
    revoked_at,
    source,
    source_route,
    copy_version,
    consent_text,
    seller,
    signer_name,
    phone,
    request_hash,
    user_agent_hash
  ) VALUES
  (
    created_reservation_id,
    lower(trim(_email)),
    'email',
    _email_granted,
    CASE WHEN _email_granted THEN captured_at ELSE NULL END,
    CASE WHEN _email_granted THEN NULL ELSE captured_at END,
    _source,
    _source_route,
    _copy_version,
    _email_consent_text,
    _seller,
    NULL,
    NULL,
    _request_hash,
    _user_agent_hash
  ),
  (
    created_reservation_id,
    lower(trim(_email)),
    'sms',
    _sms_granted,
    CASE WHEN _sms_granted THEN captured_at ELSE NULL END,
    CASE WHEN _sms_granted THEN NULL ELSE captured_at END,
    _source,
    _source_route,
    _copy_version,
    _sms_consent_text,
    _seller,
    NULL,
    trim(_phone),
    _request_hash,
    _user_agent_hash
  ),
  (
    created_reservation_id,
    lower(trim(_email)),
    'ai_call',
    _ai_call_granted,
    CASE WHEN _ai_call_granted THEN captured_at ELSE NULL END,
    CASE WHEN _ai_call_granted THEN NULL ELSE captured_at END,
    _source,
    _source_route,
    _copy_version,
    _ai_call_consent_text,
    _seller,
    CASE WHEN _ai_call_granted THEN trim(_ai_call_signer_name) ELSE NULL END,
    trim(_phone),
    _request_hash,
    _user_agent_hash
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_summit_reservation_with_consents(
  text, text, text, text, boolean, boolean, boolean, text, text, text, text, text,
  text, text, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_summit_reservation_with_consents(
  text, text, text, text, boolean, boolean, boolean, text, text, text, text, text,
  text, text, text, text, text
) TO service_role;
