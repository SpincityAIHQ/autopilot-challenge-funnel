CREATE OR REPLACE FUNCTION public.academy_reconcile_order(p_order text, p_email text, p_updated timestamp with time zone, p_status text, p_review boolean, p_lines jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE current_stamp timestamptz; line jsonb; BEGIN
 INSERT INTO public.academy_orders(order_id,email,shopify_updated_at,financial_status) VALUES(p_order,p_email,'epoch',p_status) ON CONFLICT DO NOTHING;
 SELECT shopify_updated_at INTO current_stamp FROM public.academy_orders WHERE order_id=p_order FOR UPDATE;
 IF current_stamp>p_updated THEN RETURN false; END IF;
 UPDATE public.academy_orders SET email=p_email,shopify_updated_at=p_updated,financial_status=p_status,needs_review=p_review,updated_at=now() WHERE order_id=p_order;
 UPDATE public.academy_grants SET active=false,updated_at=now() WHERE order_id=p_order;
 FOR line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  INSERT INTO public.academy_grants(order_id,line_id,email,variant_id,tier,quantity,active)
  VALUES(p_order,line->>'id',p_email,line->>'variantId',line->>'tier',(line->>'quantity')::integer,(line->>'active')::boolean)
  ON CONFLICT(order_id,line_id) DO UPDATE SET email=excluded.email,variant_id=excluded.variant_id,tier=excluded.tier,quantity=excluded.quantity,active=excluded.active,updated_at=now();
 END LOOP;
 IF current_stamp<p_updated AND EXISTS (SELECT 1 FROM public.academy_grants WHERE order_id=p_order) THEN
  INSERT INTO public.academy_events(user_id,name,payload)
  SELECT user_id,CASE WHEN p_status='PAID' AND NOT p_review AND EXISTS (SELECT 1 FROM public.academy_grants WHERE order_id=p_order AND active) THEN 'purchase_verified' ELSE 'purchase_updated' END,
    jsonb_build_object('orderId',p_order,'financialStatus',p_status,'needsReview',p_review)
  FROM public.academy_profiles WHERE email=p_email;
  INSERT INTO public.academy_outbox(dedup_key,user_id,name,payload,due_at)
  SELECT 'purchase-sync:'||p_order||':'||extract(epoch from p_updated)::text||':'||user_id,user_id,'purchase_updated',
    jsonb_build_object('orderId',p_order,'purpose','customer_sync'),now()
  FROM public.academy_profiles WHERE email=p_email ON CONFLICT(dedup_key) DO NOTHING;
 END IF;
 RETURN true;
END $function$
;
REVOKE ALL ON FUNCTION public.academy_reconcile_order(text,text,timestamptz,text,boolean,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_reconcile_order(text,text,timestamptz,text,boolean,jsonb) TO service_role;

