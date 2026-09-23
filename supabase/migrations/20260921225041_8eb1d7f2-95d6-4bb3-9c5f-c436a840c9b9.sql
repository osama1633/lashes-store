INSERT INTO public.staff_phones (phone, name, role, is_active)
VALUES ('+966558654332', 'المدير', 'admin', true)
ON CONFLICT (phone) DO UPDATE SET role = 'admin', is_active = true;