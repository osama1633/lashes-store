DROP POLICY IF EXISTS "Active products are public" ON public.products;
CREATE POLICY "Active products are public" ON public.products FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "Published categories are public" ON public.categories;
CREATE POLICY "Published categories are public" ON public.categories FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "Product images are public" ON public.product_images;
CREATE POLICY "Product images are public" ON public.product_images FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.is_active));

DROP POLICY IF EXISTS "Active payment methods are public" ON public.payment_methods;
CREATE POLICY "Active payment methods are public" ON public.payment_methods FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "Active shipping methods are public" ON public.shipping_methods;
CREATE POLICY "Active shipping methods are public" ON public.shipping_methods FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "Active banners are public" ON public.promo_banners;
CREATE POLICY "Active banners are public" ON public.promo_banners FOR SELECT TO anon, authenticated USING (is_active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));

DROP POLICY IF EXISTS "Approved reviews are public" ON public.reviews;
CREATE POLICY "Approved reviews are public" ON public.reviews FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Customers read own reviews" ON public.reviews FOR SELECT TO authenticated USING (customer_id = auth.uid());