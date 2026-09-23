CREATE OR REPLACE FUNCTION public.claim_store_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE jwt_email text;
BEGIN
  jwt_email := lower(COALESCE(auth.jwt() ->> 'email', ''));
  IF auth.uid() IS NULL OR jwt_email NOT IN ('abdulazizrashudi@gmail.com','dody505060607070@gmail.com') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_store_admin() TO authenticated;

DROP POLICY IF EXISTS "Authorized account claims admin role" ON public.user_roles;
CREATE POLICY "Authorized account claims admin role" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'admin'::app_role AND lower(COALESCE(auth.jwt() ->> 'email', '')) IN ('abdulazizrashudi@gmail.com','dody505060607070@gmail.com'));

DROP POLICY IF EXISTS "Authorized admin reads roles" ON public.user_roles;
CREATE POLICY "Authorized admin reads roles" ON public.user_roles FOR SELECT TO authenticated
USING (lower(COALESCE(auth.jwt() ->> 'email', '')) IN ('abdulazizrashudi@gmail.com','dody505060607070@gmail.com'));