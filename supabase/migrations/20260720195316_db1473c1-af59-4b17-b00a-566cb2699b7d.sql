
-- Least-privilege table ACLs. RLS is already enabled with no permissive
-- policies for anon/authenticated; also revoke direct table privileges so
-- nothing can reach these tables through the Data API.

REVOKE ALL ON TABLE public.challenge_registrations FROM PUBLIC;
REVOKE ALL ON TABLE public.challenge_registrations FROM anon;
REVOKE ALL ON TABLE public.challenge_registrations FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.challenge_registrations TO service_role;

REVOKE ALL ON TABLE public.challenge_payment_events FROM PUBLIC;
REVOKE ALL ON TABLE public.challenge_payment_events FROM anon;
REVOKE ALL ON TABLE public.challenge_payment_events FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.challenge_payment_events TO service_role;

REVOKE ALL ON TABLE public.founder_seats FROM PUBLIC;
REVOKE ALL ON TABLE public.founder_seats FROM anon;
REVOKE ALL ON TABLE public.founder_seats FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.founder_seats TO service_role;

-- Reassert the safe aggregate remains browser-callable.
GRANT EXECUTE ON FUNCTION public.founder_seats_remaining() TO anon, authenticated, service_role;

-- Reassert privileged fulfillment RPCs remain service-role only.
REVOKE ALL ON FUNCTION public.claim_lowest_founder_seat(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lowest_founder_seat(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.fulfill_challenge_payment(text,text,boolean,integer,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_challenge_payment(text,text,boolean,integer,text,text,text,text) TO service_role;
