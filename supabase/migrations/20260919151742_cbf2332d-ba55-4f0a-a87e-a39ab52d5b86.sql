CREATE TABLE public.content_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'صفحة نصية',
  content_ar text NOT NULL DEFAULT '',
  seo_title text,
  seo_url text,
  seo_description text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.content_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_pages TO authenticated;
GRANT ALL ON public.content_pages TO service_role;

ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published content pages are public"
ON public.content_pages FOR SELECT
TO anon, authenticated
USING (is_published OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage content pages"
ON public.content_pages FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER content_pages_updated_at
BEFORE UPDATE ON public.content_pages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.content_pages (title_ar, slug, category, content_ar, seo_title, seo_url, seo_description, sort_order)
VALUES
('سياسة الاستبدال والاسترجاع', 'returns-policy', 'السياسات', 'توضح هذه الصفحة سياسة الاستبدال والاسترجاع الخاصة بمتجر LASHES ½.', 'سياسة الاستبدال والاسترجاع | LASHES ½', '/returns-policy', 'تعرفي على سياسة الاستبدال والاسترجاع في متجر LASHES ½.', 1),
('من نحن', 'about-us', 'صفحة نصية', 'LASHES ½ علامة سعودية متخصصة في منتجات جمال الرموش.', 'من نحن | LASHES ½', '/about-us', 'تعرفي على علامة LASHES ½ ومنتجاتها.', 2),
('الأسئلة الشائعة', 'faq', 'الدعم', 'إجابات عن أكثر الأسئلة شيوعاً حول الطلب والدفع والشحن.', 'الأسئلة الشائعة | LASHES ½', '/faq', 'إجابات الأسئلة الشائعة لعميلات LASHES ½.', 3),
('تواصل معنا', 'contact-us', 'التواصل', 'يسعد فريق LASHES ½ بخدمتك والإجابة عن استفساراتك.', 'تواصل معنا | LASHES ½', '/contact-us', 'طرق التواصل مع فريق LASHES ½.', 4);