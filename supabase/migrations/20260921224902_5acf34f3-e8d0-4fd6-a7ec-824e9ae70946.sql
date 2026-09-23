REVOKE EXECUTE ON FUNCTION public.claim_staff_access() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_store_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_staff_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_store_admin() TO authenticated;