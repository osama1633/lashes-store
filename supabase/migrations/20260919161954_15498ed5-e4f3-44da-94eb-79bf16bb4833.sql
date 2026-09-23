CREATE TABLE public.customer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT 'mint',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_groups TO authenticated;
GRANT ALL ON public.customer_groups TO service_role;
ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage customer groups" ON public.customer_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER customer_groups_updated_at BEFORE UPDATE ON public.customer_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.merchant_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL,
  service_name text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','approved','completed','cancelled')),
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_service_requests TO authenticated;
GRANT ALL ON public.merchant_service_requests TO service_role;
ALTER TABLE public.merchant_service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage merchant service requests" ON public.merchant_service_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER merchant_service_requests_updated_at BEFORE UPDATE ON public.merchant_service_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.influencer_collaborations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_name text NOT NULL,
  platform text NOT NULL,
  handle text,
  status text NOT NULL DEFAULT 'shortlisted' CHECK (status IN ('shortlisted','invited','active','completed','declined')),
  budget numeric NOT NULL DEFAULT 0 CHECK (budget >= 0),
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_collaborations TO authenticated;
GRANT ALL ON public.influencer_collaborations TO service_role;
ALTER TABLE public.influencer_collaborations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage influencer collaborations" ON public.influencer_collaborations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER influencer_collaborations_updated_at BEFORE UPDATE ON public.influencer_collaborations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.app_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_key text NOT NULL UNIQUE,
  app_name text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected','connected','paused')),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_connections TO authenticated;
GRANT ALL ON public.app_connections TO service_role;
ALTER TABLE public.app_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage app connections" ON public.app_connections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER app_connections_updated_at BEFORE UPDATE ON public.app_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();