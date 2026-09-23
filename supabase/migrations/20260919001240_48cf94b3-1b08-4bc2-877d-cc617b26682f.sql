CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
CREATE TYPE public.order_status AS ENUM ('new', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');
CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'customer',
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.claim_store_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE jwt_email text;
BEGIN
  jwt_email := lower(COALESCE(auth.jwt() ->> 'email', ''));
  IF auth.uid() IS NULL OR jwt_email <> 'abdulazizrashudi@gmail.com' THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_store_admin() TO authenticated;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  phone text,
  email text,
  avatar_url text,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  orders_count integer NOT NULL DEFAULT 0 CHECK (orders_count >= 0),
  total_spent numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Customers update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  slug text NOT NULL UNIQUE,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published categories are public" ON public.categories FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_en text,
  slug text NOT NULL UNIQUE,
  description_ar text NOT NULL DEFAULT '',
  description_en text,
  regular_price numeric(12,2) NOT NULL CHECK (regular_price >= 0),
  sale_price numeric(12,2) CHECK (sale_price IS NULL OR sale_price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  sku text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_bestseller boolean NOT NULL DEFAULT false,
  specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products are public" ON public.products FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product images are public" ON public.product_images FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.is_active OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Admins manage product images" ON public.product_images FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.shipping_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  company text,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  free_shipping_threshold numeric(12,2),
  regions jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_days_min integer NOT NULL DEFAULT 2,
  estimated_days_max integer NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shipping_methods TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shipping_methods TO authenticated;
GRANT ALL ON public.shipping_methods TO service_role;
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active shipping methods are public" ON public.shipping_methods FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage shipping" ON public.shipping_methods FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_methods TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active payment methods are public" ON public.payment_methods FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage payment methods" ON public.payment_methods FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type public.discount_type NOT NULL,
  discount_value numeric(12,2) NOT NULL CHECK (discount_value > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  minimum_order numeric(12,2) NOT NULL DEFAULT 0,
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  tax_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  payment_method text NOT NULL,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  shipping_method text NOT NULL,
  status public.order_status NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own orders" ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  sku text NOT NULL,
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total numeric(12,2) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Customers add own order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id uuid,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL,
  status public.review_status NOT NULL DEFAULT 'pending',
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved reviews are public" ON public.reviews FOR SELECT TO anon, authenticated USING (status = 'approved' OR customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  subtitle_ar text,
  image_url text,
  link_url text,
  position text NOT NULL DEFAULT 'home',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promo_banners TO authenticated;
GRANT ALL ON public.promo_banners TO service_role;
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active banners are public" ON public.promo_banners FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage banners" ON public.promo_banners FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  email text,
  phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(12,2) NOT NULL DEFAULT 0,
  recovered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.abandoned_carts TO authenticated;
GRANT ALL ON public.abandoned_carts TO service_role;
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage abandoned carts" ON public.abandoned_carts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.customer_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_campaigns TO authenticated;
GRANT ALL ON public.customer_campaigns TO service_role;
ALTER TABLE public.customer_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage campaigns" ON public.customer_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.store_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  store_name text NOT NULL DEFAULT 'LASHES 1/2',
  logo_url text,
  whatsapp text,
  email text,
  phone text,
  vat_rate numeric(5,2) NOT NULL DEFAULT 15,
  currency text NOT NULL DEFAULT 'SAR',
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  shipping_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  policies jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store settings are public" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.store_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER shipping_methods_updated_at BEFORE UPDATE ON public.shipping_methods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER banners_updated_at BEFORE UPDATE ON public.promo_banners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER carts_updated_at BEFORE UPDATE ON public.abandoned_carts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.customer_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.reduce_stock_on_paid_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid' THEN
    UPDATE public.products p SET stock = p.stock - oi.quantity
    FROM public.order_items oi WHERE oi.order_id = NEW.id AND p.id = oi.product_id AND p.stock >= oi.quantity;
    IF EXISTS (SELECT 1 FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id WHERE oi.order_id = NEW.id AND p.stock < 0) THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE public.profiles SET orders_count = orders_count + 1, total_spent = total_spent + NEW.total WHERE id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER orders_reduce_stock AFTER UPDATE OF payment_status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.reduce_stock_on_paid_order();

CREATE INDEX products_category_idx ON public.products(category_id);
CREATE INDEX products_active_idx ON public.products(is_active, created_at DESC);
CREATE INDEX orders_customer_idx ON public.orders(customer_id, created_at DESC);
CREATE INDEX orders_status_idx ON public.orders(status, created_at DESC);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
CREATE INDEX reviews_product_status_idx ON public.reviews(product_id, status);

ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;

INSERT INTO public.categories(name_ar, name_en, slug, sort_order) VALUES
('الرموش اليومية', 'Daily Lashes', 'daily', 1),
('الرموش الكثيفة', 'Volume Lashes', 'volume', 2),
('الرموش الناعمة', 'Soft Lashes', 'soft', 3),
('نصف رمش', 'Half Lashes', 'half-lashes', 4);

INSERT INTO public.products(category_id, name_ar, name_en, slug, description_ar, regular_price, sale_price, stock, sku, is_featured, is_bestseller, specifications)
SELECT c.id, p.name_ar, p.name_en, p.slug, p.description_ar, p.regular_price, p.sale_price, p.stock, p.sku, p.is_featured, p.is_bestseller, p.specifications
FROM public.categories c
JOIN (VALUES
('daily','نجد','Najd','najd','رمش يومي خفيف يمنح عينيك تحديداً أنيقاً وطبيعياً.',89::numeric,NULL::numeric,45,'L12-NJD',true,true,'{"length":"متوسط","volume":"ناعم","style":"طبيعي"}'::jsonb),
('volume','ليال','Layal','layal','كثافة فاخرة بتدرج ناعم لإطلالة المناسبات.',119::numeric,99::numeric,28,'L12-LYL',true,true,'{"length":"طويل","volume":"كثيف","style":"درامي"}'::jsonb),
('soft','سُهى','Soha','soha','خصل حريرية موزعة بعناية لنتيجة ناعمة.',85::numeric,NULL::numeric,60,'L12-SHA',false,false,'{"length":"قصير","volume":"ناعم","style":"طبيعي"}'::jsonb),
('half-lashes','دانة','Dana','dana','نصف رمش يرفع الزاوية الخارجية للعين بسهولة.',79::numeric,NULL::numeric,12,'L12-DNA',true,true,'{"length":"متوسط","volume":"متوسط","style":"عين القطة"}'::jsonb),
('volume','جود','Joud','joud','رموش متعددة الطبقات بكثافة متوازنة وفاخرة.',109::numeric,NULL::numeric,4,'L12-JOD',false,true,'{"length":"طويل","volume":"كثيف","style":"متدرج"}'::jsonb),
('daily','ريم','Reem','reem','رمش مرن وخفيف مصمم للاستخدام اليومي.',89::numeric,NULL::numeric,36,'L12-REM',false,false,'{"length":"متوسط","volume":"متوسط","style":"مفتوح"}'::jsonb)
) AS p(category_slug,name_ar,name_en,slug,description_ar,regular_price,sale_price,stock,sku,is_featured,is_bestseller,specifications)
ON c.slug = p.category_slug;

INSERT INTO public.shipping_methods(name_ar, company, price, free_shipping_threshold, regions, estimated_days_min, estimated_days_max) VALUES
('الشحن القياسي','سمسا',25,199,'["الرياض","جدة","الدمام","مكة","المدينة المنورة","باقي مناطق المملكة"]'::jsonb,2,5);
INSERT INTO public.payment_methods(code,name_ar,sort_order) VALUES
('mada','مدى',1),('cards','فيزا / ماستركارد',2),('apple_pay','Apple Pay',3),('stc_pay','STC Pay',4),('cod','الدفع عند الاستلام',5);
INSERT INTO public.store_settings(id, store_name, vat_rate, currency, shipping_settings, policies) VALUES
(true,'LASHES 1/2',15,'SAR','{"free_shipping_threshold":199}'::jsonb,'{"shipping":"التوصيل داخل المملكة خلال 2-5 أيام عمل","returns":"يمكن الاسترجاع وفق سياسة المتجر"}'::jsonb);