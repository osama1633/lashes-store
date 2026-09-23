INSERT INTO public.products (name_ar, name_en, slug, description_ar, regular_price, sale_price, stock, low_stock_threshold, sku, is_active, is_featured, is_bestseller, specifications, created_at, updated_at)
VALUES
  ('مسكرة LASHES ½', 'LASHES 1/2 Mascara', 'lashes-half-mascara', 'عبوة واحدة من مسكرة LASHES ½.', 149, 99, 100, 5, 'LASHES-1', true, true, false, '{"quantity":1}'::jsonb, now() - interval '3 minutes', now()),
  ('باقة عبوتين', 'Two Mascara Bundle', 'lashes-two-pack', 'باقة توفير تحتوي على عبوتين من مسكرة LASHES ½.', 298, 159, 100, 5, 'LASHES-2', true, true, true, '{"quantity":2}'::jsonb, now() - interval '2 minutes', now()),
  ('باقة ٣ عبوات', 'Three Mascara Bundle', 'lashes-three-pack', 'باقة توفير تحتوي على ثلاث عبوات من مسكرة LASHES ½.', 447, 249, 100, 5, 'LASHES-3', true, true, false, '{"quantity":3}'::jsonb, now() - interval '1 minute', now())
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  regular_price = EXCLUDED.regular_price,
  sale_price = EXCLUDED.sale_price,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  sku = EXCLUDED.sku,
  is_active = EXCLUDED.is_active,
  is_featured = EXCLUDED.is_featured,
  is_bestseller = EXCLUDED.is_bestseller,
  specifications = EXCLUDED.specifications,
  updated_at = now();