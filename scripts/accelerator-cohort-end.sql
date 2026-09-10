-- Apply this additive SQL before deploying code that sends p_programme_end.
-- No historical rows are expired or assigned a cohort date by this script.
BEGIN;
ALTER TABLE public.academy_access_codes ADD COLUMN IF NOT EXISTS programme_ends_at timestamptz;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.academy_access_codes'::regclass AND conname='academy_code_programme_end') THEN
  ALTER TABLE public.academy_access_codes ADD CONSTRAINT academy_code_programme_end
   CHECK (programme_ends_at IS NULL OR (tier='accelerator' AND isfinite(programme_ends_at) AND
    (access_until IS NULL OR access_until<=programme_ends_at) AND expires_at<=programme_ends_at));
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.academy_preserve_programme_end()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
 IF NEW.programme_ends_at IS DISTINCT FROM OLD.programme_ends_at THEN
  RAISE EXCEPTION 'PROGRAMME_END_IMMUTABLE';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS academy_programme_end_immutable ON public.academy_access_codes;
CREATE TRIGGER academy_programme_end_immutable BEFORE UPDATE ON public.academy_access_codes
FOR EACH ROW EXECUTE FUNCTION public.academy_preserve_programme_end();
REVOKE ALL ON FUNCTION public.academy_preserve_programme_end() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_preserve_programme_end() TO service_role;

-- Replace the seven-argument signature with an eighth optional argument.
-- Existing GA/VIP/Vault callers can still omit the new argument.
DROP FUNCTION IF EXISTS public.academy_issue_access_code(uuid,uuid,text,text,text,integer,text);
CREATE OR REPLACE FUNCTION public.academy_issue_access_code(p_id uuid,p_generation uuid,p_order text,p_line text,p_hash text,p_hours integer,p_terms text,p_programme_end timestamptz DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE g public.academy_grants; c public.academy_access_codes; o public.academy_orders; BEGIN
 SELECT * INTO o FROM public.academy_orders WHERE order_id=p_order FOR UPDATE;
 SELECT * INTO g FROM public.academy_grants WHERE order_id=p_order AND line_id=p_line FOR UPDATE;
 IF o.order_id IS NULL OR g.order_id IS NULL OR o.financial_status NOT IN ('PAID','PARTIALLY_REFUNDED') OR NOT g.active OR g.quantity<>1 OR o.needs_review OR g.email='' OR p_terms='' THEN RETURN NULL; END IF;
 SELECT * INTO c FROM public.academy_access_codes WHERE order_id=p_order AND line_id=p_line FOR UPDATE;
 IF c.id IS NOT NULL AND c.tier<>g.tier THEN RETURN NULL; END IF;
 IF c.id IS NOT NULL AND c.redeemed_at IS NOT NULL THEN RETURN c.id; END IF;
 IF c.programme_ends_at IS NOT NULL AND c.programme_ends_at<=now() THEN RETURN NULL; END IF;
 IF c.id IS NOT NULL AND c.expires_at>now() AND c.email=g.email THEN RETURN c.id; END IF;
 IF c.id IS NULL THEN
  -- Only a new Accelerator purchase can acquire this immutable programme cap.
  -- Legacy rows retain their original purchased terms; no silent retroactive expiry.
  IF g.tier='accelerator' AND (p_programme_end IS NULL OR NOT isfinite(p_programme_end) OR p_programme_end<=now()) THEN RETURN NULL; END IF;
  IF g.tier<>'accelerator' AND p_programme_end IS NOT NULL THEN RETURN NULL; END IF;
  INSERT INTO public.academy_access_codes(id,generation,order_id,line_id,email,tier,code_hash,access_hours,terms_version,programme_ends_at,expires_at)
  VALUES(p_id,p_generation,p_order,p_line,g.email,g.tier,p_hash,p_hours,p_terms,p_programme_end,least(now()+interval '30 days',p_programme_end)) RETURNING * INTO c;
 ELSE
  IF c.id<>p_id THEN RAISE EXCEPTION 'CODE_CHANGED_RETRY'; END IF;
  UPDATE public.academy_access_deliveries SET status='cancelled',completed_at=now() WHERE code_id=c.id AND status='pending';
  UPDATE public.academy_access_codes SET generation=p_generation,email=g.email,tier=g.tier,code_hash=p_hash,
   issued_at=now(),expires_at=least(now()+interval '30 days',c.programme_ends_at) WHERE id=c.id RETURNING * INTO c;
  -- Reissue retains the original purchased access term. It does not extend a redeemed entitlement.
 END IF;
 INSERT INTO public.academy_access_deliveries(code_id,generation) VALUES(c.id,c.generation) ON CONFLICT DO NOTHING;
 RETURN c.id;
END $$;

CREATE OR REPLACE FUNCTION public.academy_redeem_access_code(p_user uuid,p_email text,p_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c public.academy_access_codes; g public.academy_grants; o public.academy_orders; BEGIN
 SELECT * INTO c FROM public.academy_access_codes WHERE code_hash=p_hash;
 IF c.id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO o FROM public.academy_orders WHERE order_id=c.order_id FOR UPDATE;
 SELECT * INTO g FROM public.academy_grants WHERE order_id=c.order_id AND line_id=c.line_id FOR UPDATE;
 SELECT * INTO c FROM public.academy_access_codes WHERE id=c.id FOR UPDATE;
 IF o.order_id IS NULL OR g.order_id IS NULL OR o.financial_status NOT IN ('PAID','PARTIALLY_REFUNDED') OR c.code_hash<>p_hash OR c.tier<>g.tier OR NOT g.active OR o.needs_review OR g.quantity<>1 OR g.email<>c.email OR c.email<>p_email THEN RETURN NULL; END IF;
 IF c.programme_ends_at IS NOT NULL AND c.programme_ends_at<=now() THEN RETURN NULL; END IF;
 IF c.redeemed_at IS NOT NULL THEN
  IF c.redeemed_by IS DISTINCT FROM p_user OR c.access_until<=now() THEN RETURN NULL; END IF;
 ELSE
  IF c.expires_at<=now() THEN RETURN NULL; END IF;
  UPDATE public.academy_access_codes SET redeemed_by=p_user,redeemed_at=now(),access_until=least(now()+make_interval(hours=>access_hours),programme_ends_at)
  WHERE id=c.id RETURNING * INTO c;
  INSERT INTO public.academy_events(user_id,name,payload) VALUES(p_user,'access_redeemed',jsonb_build_object('tier',c.tier));
 END IF;
 RETURN jsonb_build_object('tier',c.tier,'accessUntil',c.access_until);
END $$;

REVOKE ALL ON FUNCTION public.academy_issue_access_code(uuid,uuid,text,text,text,integer,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_issue_access_code(uuid,uuid,text,text,text,integer,text,timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.academy_redeem_access_code(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_redeem_access_code(uuid,text,text) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
