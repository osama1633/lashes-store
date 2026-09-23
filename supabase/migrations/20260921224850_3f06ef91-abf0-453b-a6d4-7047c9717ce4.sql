CREATE TABLE public.staff_phones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL UNIQUE,
  name text,
  role app_role NOT NULL DEFAULT 'admin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_phones TO authenticated;
GRANT ALL ON public.staff_phones TO service_role;

ALTER TABLE public.staff_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage staff phones" ON public.staff_phones
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER staff_phones_updated_at BEFORE UPDATE ON public.staff_phones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.claim_staff_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_phone text;
  staff_role app_role;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  jwt_phone := regexp_replace(COALESCE(auth.jwt() ->> 'phone', ''), '\D', '', 'g');
  IF jwt_phone = '' THEN RETURN false; END IF;
  SELECT role INTO staff_role FROM public.staff_phones
   WHERE regexp_replace(phone, '\D', '', 'g') = jwt_phone AND is_active
   LIMIT 1;
  IF staff_role IS NULL THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), staff_role) ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_staff_access() TO authenticated;