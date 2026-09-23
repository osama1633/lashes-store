GRANT INSERT, UPDATE ON public.storefront_drafts TO authenticated;
GRANT INSERT, UPDATE ON public.storefront_published TO authenticated;
CREATE POLICY "Admins write draft" ON public.storefront_drafts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins publish layout" ON public.storefront_published FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
ALTER FUNCTION public.set_storefront_draft(jsonb) SECURITY INVOKER;
ALTER FUNCTION public.publish_storefront_draft() SECURITY INVOKER;