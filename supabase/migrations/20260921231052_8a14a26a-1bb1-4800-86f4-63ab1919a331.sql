INSERT INTO public.payment_methods (code, name_ar, is_active, sort_order, settings)
VALUES ('tabby', 'تابي — قسّمها على ٤ دفعات بدون فوائد', true, 20, '{}'::jsonb)
ON CONFLICT (code) DO UPDATE SET name_ar = EXCLUDED.name_ar, is_active = true;