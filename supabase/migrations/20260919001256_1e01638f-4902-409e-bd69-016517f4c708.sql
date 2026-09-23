REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

DROP POLICY "Admins read roles" ON public.user_roles;
CREATE POLICY "Authorized admin reads roles" ON public.user_roles FOR SELECT TO authenticated USING (lower(COALESCE(auth.jwt() ->> 'email', '')) = 'abdulazizrashudi@gmail.com');
CREATE POLICY "Authorized account claims admin role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'admin' AND lower(COALESCE(auth.jwt() ->> 'email', '')) = 'abdulazizrashudi@gmail.com');

REVOKE ALL ON FUNCTION public.claim_store_admin() FROM PUBLIC, anon;
ALTER FUNCTION public.claim_store_admin() SECURITY INVOKER;
GRANT EXECUTE ON FUNCTION public.claim_store_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.reduce_stock_on_paid_order() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;