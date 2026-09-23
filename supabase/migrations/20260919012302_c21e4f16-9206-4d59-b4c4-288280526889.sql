ALTER FUNCTION public.claim_store_admin() SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.claim_store_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_store_admin() TO authenticated;