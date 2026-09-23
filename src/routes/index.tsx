import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Heart, LayoutDashboard, LogOut, Menu, Minus, Plus, Search, ShieldCheck, ShoppingBag, Star, Trash2, Truck, UserRound, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { LoginDialog } from "@/components/LoginDialog";
import { fetchProducts, type Product } from "@/lib/store";
import { CountUp, LiquidScroll, TypeText } from "@/lib/motion";
import { sendOrderConfirmation } from "@/lib/notify.functions";
import { cancelTabbyOrder, confirmTabbyPayment, createTabbyCheckout } from "@/lib/tabby.functions";
import productAsset from "@/assets/lashes-product.jpg.asset.json";
import logoAsset from "@/assets/lashes-logo.jpg.asset.json";
import bundleProductImage from "@/assets/lashes-bundle-product.jpg";
import { initialOrder, normalizeSiteContent, sectionNames, type SiteContent } from "@/lib/site-editor";

const ADMIN_EMAILS = ["abdulazizrashudi@gmail.com", "dody505060607070@gmail.com", "of94086@gmail.com"];

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "LASHES ½ | مسكرة الرموش الفاخرة" },
    { name: "description", content: "مسكرة LASHES ½ لتطويل وتكثيف الرموش والحواجب، بتوصيل سريع داخل السعودية." },
    { property: "og:title", content: "LASHES ½ | مسكرة الرموش الفاخرة" },
    { property: "og:description", content: "نظرة تأسر من أول رمشة مع مسكرة LASHES ½." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Storefront,
});

type CartItem = { product: Product; quantity: number };
type ReviewItem = { id: string; customer_name: string; rating: number; body: string; city: string };
type ShippingMethod = { id: string; name_ar: string; price: number; free_shipping_threshold: number | null; estimated_days_min: number; estimated_days_max: number };
type PaymentMethod = { id: string; code: string; name_ar: string };
const fallbackReviews: ReviewItem[] = [
  { id: "noura", customer_name: "نورة أ.", rating: 5, body: "أفضل مسكرة جربتها على الإطلاق! كثافة واضحة من أول استخدام ولا تتكتل أبدًا. صارت أساسية في شنطتي.", city: "الرياض" },
  { id: "sara", customer_name: "سارة م.", rating: 5, body: "تدوم طول اليوم بدون أي تساقط وسهلة الإزالة. الجودة تستاهل وأكثر، نصحت فيها كل صديقاتي!", city: "جدة" },
  { id: "reem", customer_name: "ريم ك.", rating: 5, body: "الفرشاة رائعة وتوصل لكل رمشة بدقة. تجربة جميلة جدًا وأكيد بأعيد الطلب مرة ثانية.", city: "خميس مشيط" },
];
const arNumber = (value: number) => new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(value);
const price = (value: number) => `${arNumber(value)} ر.س`;
const productImage = productAsset.url;
const packageOrder = ["lashes-half-mascara", "lashes-two-pack", "lashes-three-pack"];
const productDisplayImage = (product: Product) => packageOrder.includes(product.slug) ? bundleProductImage : product.product_images?.[0]?.image_url || productImage;

function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [orderDone, setOrderDone] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [reviews, setReviews] = useState<ReviewItem[]>(fallbackReviews);
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [siteContent, setSiteContent] = useState<SiteContent>({ order: initialOrder });
  const [previewMode, setPreviewMode] = useState(false);
  const [previewPrices, setPreviewPrices] = useState<Record<string, { regular_price: string; sale_price: string }>>({});
  const [editorImages, setEditorImages] = useState<Record<string, string>>({});
  const [imageRefresh, setImageRefresh] = useState(0);

  const load = async () => {
    try {
      const list = await fetchProducts();
      setProducts(list);
      const { data } = await supabase.from("reviews").select("id,customer_name,rating,body").eq("status", "approved").limit(6);
      if (data?.length) setReviews(data.map((review, index) => ({ ...review, city: ["الرياض", "جدة", "خميس مشيط"][index % 3] ?? "الرياض" })));
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const isPreview = new URLSearchParams(window.location.search).get("editor-preview") === "1" && window.self !== window.top;
    setPreviewMode(isPreview);
    void supabase.from("storefront_published").select("content").eq("id", true).maybeSingle().then(({ data }) => { if (data && !isPreview) setSiteContent(normalizeSiteContent(data.content)); });
    if (isPreview) {
      const receive = (event: MessageEvent) => {
        if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== "lashes-preview") return;
        setSiteContent(normalizeSiteContent(event.data.content));
        if (event.data.content?.prices && typeof event.data.content.prices === "object") setPreviewPrices(event.data.content.prices);
      };
      const scrollTo = (event: MessageEvent) => {
        if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== "lashes-scroll") return;
        document.querySelector(`[data-editor-section="${String(event.data.section).replace(/[^a-z-]/g, "")}"]`)?.scrollIntoView({ behavior: "smooth" });
      };
      window.addEventListener("message", receive); window.addEventListener("message", scrollTo);
      window.parent.postMessage({ type: "lashes-ready" }, window.location.origin);
      return () => { window.removeEventListener("message", receive); window.removeEventListener("message", scrollTo); };
    }
    return undefined;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabby = params.get("tabby");
    const orderNumber = params.get("order") ?? "";
    if (tabby && orderNumber && window.self === window.top) {
      const paymentId = params.get("payment_id") ?? params.get("payment.id") ?? "";
      window.history.replaceState({}, "", window.location.pathname);
      setCart([]);
      if (tabby === "success" && paymentId) {
        void confirmTabbyPayment({ data: { paymentId, orderNumber } }).then((result) => {
          if (result.status === "paid") {
            setOrderDone(orderNumber);
            void sendOrderConfirmation({ data: { phone: sessionStorage.getItem("lash-tabby-phone") ?? "", orderNumber, customerName: sessionStorage.getItem("lash-tabby-name") ?? "", total: 0 } }).catch(() => undefined);
          } else setPaymentNote(result.status === "failed" ? "لم يكتمل الدفع عبر تابي وتم إلغاء الطلب. يمكنك إعادة المحاولة أو الدفع عند الاستلام." : "جارٍ تأكيد الدفع عبر تابي، سنوافيك بالتأكيد على جوالك.");
        }).catch(() => setPaymentNote("تعذّر التحقق من حالة الدفع، تواصلي معنا عبر واتساب."));
      } else {
        void cancelTabbyOrder({ data: { orderNumber, reason: tabby === "failure" ? "failure" : "cancel" } }).catch(() => undefined);
        setPaymentNote(tabby === "failure" ? "فشل الدفع عبر تابي ولم يتم تأكيد الطلب." : "تم إلغاء الدفع عبر تابي ولم يتم تأكيد الطلب.");
      }
    }
    void load();
    void supabase.auth.getUser().then(({ data }) => { setUser(data.user); });
    const auth = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (event === "SIGNED_IN") {
        setLoginOpen(false);
        const intentSignin = sessionStorage.getItem("lash-intent-signin") === "1";
        sessionStorage.removeItem("lash-intent-signin");
        if (intentSignin && nextUser && ADMIN_EMAILS.includes(nextUser.email?.toLowerCase() ?? "")) window.location.assign("/admin");
      }
    });
    const channel = supabase.channel("store-live").on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => void load()).on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => void load()).subscribe();
    return () => { auth.data.subscription.unsubscribe(); void supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setImageRefresh(value => value + 1), 50 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    const images = Object.entries(siteContent.fields ?? {}).filter(([, value]) => value.startsWith("storage:"));
    void Promise.all(images.map(async ([key, value]) => {
      const { data } = await supabase.storage.from("product-images").createSignedUrl(value.slice(8), 3600);
      return [key, data?.signedUrl] as const;
    })).then(rows => { if (active) setEditorImages(Object.fromEntries(rows.filter((row): row is readonly [string, string] => Boolean(row[1])))); });
    return () => { active = false; };
  }, [siteContent.fields, imageRefresh]);

  const visibleProducts = useMemo(() => products.filter((item) => item.name_ar.includes(query)), [products, query]);
  const packageProducts = useMemo(() => packageOrder.map((slug) => visibleProducts.find((item) => item.slug === slug)).filter((item): item is Product => Boolean(item)), [visibleProducts]);
  const shownProducts = previewMode ? packageProducts.map(p => ({ ...p, regular_price: Number(previewPrices[p.id]?.regular_price) || p.regular_price, sale_price: previewPrices[p.id]?.sale_price === "" ? null : Number(previewPrices[p.id]?.sale_price) || p.sale_price })) : packageProducts;
  const field = (key: string, fallback: string) => siteContent.fields?.[key] ?? fallback;
  const media = (key: string, fallback: string) => {
    const value = siteContent.fields?.[key];
    if (!value) return fallback;
    if (value.startsWith("storage:")) return editorImages[key] ?? fallback;
    return value.startsWith("https://") ? value : fallback;
  };
  const section = (id: string) => ({
    "data-editor-section": id,
    style: { order: (siteContent.order ?? initialOrder).indexOf(id), display: siteContent.hidden?.includes(id) ? "none" : undefined },
    onClickCapture: (event: MouseEvent) => { if (previewMode) { event.preventDefault(); event.stopPropagation(); window.parent.postMessage({ type: "lashes-select", section: id }, window.location.origin); } },
    title: previewMode ? `تعديل: ${sectionNames[id]}` : undefined,
  });
  const total = cart.reduce((sum, item) => sum + (item.product.sale_price ?? item.product.regular_price) * item.quantity, 0);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const add = (product: Product) => {
    if (product.stock < 1) return;
    setCart((current) => {
      const old = current.find((item) => item.product.id === product.id);
      return old ? current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item) : [...current, { product, quantity: 1 }];
    });
    setCartOpen(true);
  };
  const openProduct = (product: Product) => { setSelectedProduct(product); setSelectedQuantity(1); };
  const addSelected = (fastCheckout = false) => {
    if (!selectedProduct) return;
    setCart((current) => {
      const old = current.find((item) => item.product.id === selectedProduct.id);
      return old ? current.map((item) => item.product.id === selectedProduct.id ? { ...item, quantity: Math.min(item.quantity + selectedQuantity, selectedProduct.stock) } : item) : [...current, { product: selectedProduct, quantity: selectedQuantity }];
    });
    setSelectedProduct(null);
    if (fastCheckout) setCheckout(true); else setCartOpen(true);
  };
  const setQty = (id: string, quantity: number) => setCart((current) => current.map((item) => item.product.id === id ? { ...item, quantity: Math.max(1, Math.min(quantity, item.product.stock)) } : item));
  const signIn = async () => { setLoginOpen(true); };
  const isAdmin = ADMIN_EMAILS.includes(user?.email?.toLowerCase() ?? "");
  const displayName = (user?.user_metadata?.["full_name"] as string | undefined) || (user?.user_metadata?.["name"] as string | undefined) || user?.email?.split("@")[0] || "حسابي";

  return <div dir="rtl" className="store min-h-screen overflow-x-hidden bg-background">
    <div className="offer-bar px-4 py-2 text-center text-xs text-primary-foreground sm:text-sm">🚚 شحن مجاني فوق ١٥٠ ر.س &nbsp; · &nbsp; 🌸 كود <b>LAUNCH15</b> خصم ١٠٪ &nbsp; · &nbsp; 💳 الدفع عند الاستلام</div>
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 md:px-8">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="القائمة"><Menu /></Button>
        <a href="#home" className="font-editorial text-xl font-bold sm:text-2xl">LASHES <span className="text-primary">½</span></a>
        <nav className="hidden items-center gap-7 text-sm lg:flex"><a href="#home">الرئيسية</a><a href="#bundles">اختاري باقتك</a><a href="#usage">طريقة الاستخدام</a><a href="#reviews">آراء العميلات</a><a href="#faq">الأسئلة الشائعة</a></nav>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="بحث" onClick={() => setSearchOpen(!searchOpen)}><Search /></Button>
          {isAdmin && <Button size="sm" className="hidden gap-1.5 sm:inline-flex" onClick={() => window.location.assign("/admin")}><LayoutDashboard className="size-4" />لوحة التحكم</Button>}
          {user ? <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="gap-1.5 px-2" aria-label="حسابي"><UserRound className="size-5" /><span className="hidden max-w-28 truncate text-xs font-medium sm:inline">{displayName}</span></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && <DropdownMenuItem onClick={() => window.location.assign("/admin")}><LayoutDashboard className="me-2 size-4" />لوحة التحكم</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => { void supabase.auth.signOut().then(() => window.location.assign("/")); }}><LogOut className="me-2 size-4" />تسجيل الخروج</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> : <Button variant="ghost" size="icon" aria-label="تسجيل الدخول" onClick={() => void signIn()}><UserRound /></Button>}
          <Button variant="ghost" size="icon" className="relative" aria-label="السلة" onClick={() => setCartOpen(true)}><ShoppingBag /><span className="absolute -left-1 top-0 grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">{arNumber(count)}</span></Button>
        </div>
      </div>
      {menuOpen && <nav className="border-t px-5 py-3 lg:hidden">{[["#home","الرئيسية"],["#bundles","اختاري باقتك"],["#usage","طريقة الاستخدام"],["#reviews","آراء العميلات"],["#faq","الأسئلة الشائعة"]].map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block border-b py-3">{label}</a>)}</nav>}
      {searchOpen && <div className="border-t p-4"><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحثي عن المنتج..." className="mx-auto max-w-xl" /></div>}
    </header>

    <main className="flex flex-col">
      <LiquidScroll/>

      <section {...section("home")} id="home" className="bg-blush pt-8"><div className="hero-band mx-auto grid min-h-[360px] max-w-6xl items-center gap-8 overflow-hidden px-7 py-10 text-primary-foreground md:grid-cols-[1fr_.8fr] md:px-16"><div><p className="text-xs text-pink-light">★★★★★ &nbsp; المنتج الأكثر مبيعاً</p><TypeText as="h1" text={field("heroTitle", "نظرة تأسر من أول رمشة")} className="font-editorial mt-4 max-w-md text-4xl font-bold leading-tight md:text-5xl"/><p className="mt-4 max-w-md text-sm leading-7 text-primary-foreground/75">{field("heroDescription", "مسكرة سيروم لتطويل وتكثيف الرموش والحواجب، بتركيبة خفيفة وثبات يدوم طوال اليوم.")}</p><div className="mt-5 flex items-center gap-3"><strong className="text-3xl">{price(shownProducts[0]?.sale_price ?? shownProducts[0]?.regular_price ?? 99)}</strong><del className="text-primary-foreground/55">{price(shownProducts[0]?.regular_price ?? 149)}</del><span className="rounded-full bg-primary px-3 py-1 text-xs">وفّري {price((shownProducts[0]?.regular_price ?? 149) - (shownProducts[0]?.sale_price ?? shownProducts[0]?.regular_price ?? 99))}</span></div><Button className="store-cta mt-6 h-11 px-10" onClick={() => packageProducts[0] && add(packageProducts[0])}>اطلبي الآن</Button><p className="mt-4 text-[10px] text-primary-foreground/65">✓ شحن سريع &nbsp; ✓ دفع عند الاستلام &nbsp; ✓ ضمان الجودة</p></div><div className="order-first md:order-last"><img src={media("heroImage", bundleProductImage)} alt="مسكرة LASHES ½" className="hero-product mx-auto aspect-square w-full max-w-[300px] rounded-xl object-cover shadow-2xl"/></div></div><div className="hero-cut mx-auto max-w-6xl"/></section>

      <section {...section("bundles")} className="bg-blush py-10 md:py-12"><div id="bundles" className="mx-auto max-w-[750px] scroll-mt-24 px-4"><div className="text-center"><TypeText as="h2" text={field("bundlesTitle", "اختاري باقتك")} className="font-editorial text-2xl font-bold text-store-dark"/><p className="mt-2 text-xs text-primary">{field("bundlesSubtitle", "شحن سريع · دفع عند الاستلام · ضمان الجودة")}</p></div>{loading ? <p className="py-20 text-center">جارٍ تحميل المنتجات...</p> : <div className="mt-7 grid gap-4 sm:grid-cols-3">{shownProducts.map((item, index) => <ProductCard key={`${item.id}-${index}`} product={item} image={media(`productImage.${item.id}`, productDisplayImage(item))} index={index} onAdd={openProduct} />)}</div>}</div></section>

      <section {...section("usage")} id="usage" className="usage-band py-16 md:py-20"><div className="mx-auto max-w-5xl px-4"><SectionTitle eyebrow="سهلة وسريعة" title={field("usageTitle", "طريقة الاستخدام")} subtitle={field("usageSubtitle", "ثلاث خطوات لرموش آسرة")} /><div className="mt-10 grid gap-5 md:grid-cols-3">{[["🌸",field("usageStep1", "نظّفي الرموش"),"تأكّدي من خلوّ رموشك من أي مستحضرات سابقة لأفضل التصاق ونتيجة"],["✨",field("usageStep2", "طبّقي من الجذور"),"مرّري الفرشاة بحركة متعرّجة من جذور الرموش حتى الأطراف"],["💖",field("usageStep3", "كرّري للكثافة"),"أعيدي طبقة ثانية لكثافة مضاعفة وإطلالة لا تُنسى"]].map(([icon,title,text],index)=><article key={title} className="usage-card"><span className="step-number">{arNumber(index+1)}</span><div className="mx-auto grid size-14 place-items-center rounded-xl bg-primary text-2xl text-primary-foreground">{icon}</div><h3 className="mt-5 font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p><small className="mt-4 block font-bold text-primary">الخطوة {index === 0 ? "الأولى" : index === 1 ? "الثانية" : "الأخيرة"}</small></article>)}</div></div></section>

      <section {...section("featured")} className="bg-background py-16 md:py-24"><div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2"><img src={media("featuredImage", productImage)} alt="ماسكرا سيروم LASHES ½" className="w-full rounded-xl object-cover shadow-xl"/><div><div className="text-amber-500">★★★★★ <span className="text-xs text-muted-foreground">(٤٨٦ تقييم)</span></div><h2 className="font-editorial mt-4 text-3xl font-bold leading-tight md:text-4xl">{field("featuredTitle", "ماسكرا سيروم لتطويل وتكثيف الرموش والحواجب")}</h2><p className="mt-5 leading-8 text-muted-foreground"><b className="text-foreground">LASHES ½</b> — {field("featuredDescription", "ماسكارا مغذّية بالكحل تمنح رموشك طولاً وكثافة من أول لمسة، مع فرشاة دقيقة تصل لكل رمشة. تركيبة خفيفة لا تتكتّل، تدوم طول اليوم، وسهلة الإزالة.")}</p><div className="mt-5 flex items-end gap-3"><strong className="text-3xl text-primary">{price(shownProducts[0]?.sale_price ?? shownProducts[0]?.regular_price ?? 99)}</strong><del className="text-muted-foreground">{price(shownProducts[0]?.regular_price ?? 149)}</del><span className="text-sm text-primary">وفّري {price((shownProducts[0]?.regular_price ?? 149) - (shownProducts[0]?.sale_price ?? shownProducts[0]?.regular_price ?? 99))}</span></div><p className="mt-2 text-xs text-muted-foreground">السعر شامل الضريبة · شحن مجاني فوق ١٥٠</p><Button className="store-cta mt-6 h-12 w-full md:w-auto md:px-14" onClick={() => products[0] && add(products[0])}>أضيفي إلى السلة</Button><div className="mt-7 grid grid-cols-3 gap-3 text-center text-xs"><span>🌿<b className="mt-2 block">مغذّية بالكحل</b></span><span>⏱️<b className="mt-2 block">ثبات طويل</b></span><span>💧<b className="mt-2 block">سهلة الإزالة</b></span></div></div></div></section>

      <section {...section("why")} className="bg-blush py-16"><div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2"><div><h2 className="font-editorial text-2xl font-bold md:text-3xl">{field("whyTitle", "لماذا مسكرة LASHES ½ ؟")}</h2><div className="mt-6 space-y-5">{[[field("whyPoint1", "كثافة فورية"),"تركيبة غنية بالألياف الدقيقة تضاعف كثافة الرموش من أول طبقة"],[field("whyPoint2", "ثبات يدوم"),"تركيبة مقاومة للماء والعرق والدموع، تبقى نظيفة حتى ١٢ ساعة"],[field("whyPoint3", "لا تتكتل ولا تتساقط"),"فرشاة مخروطية تصل لأصغر الرموش بدقة"],[field("whyPoint4", "سهلة الإزالة"),"تُزال بالماء الدافئ فقط دون فرك أو إتلاف الرموش"]].map(([title,text])=><p key={title} className="text-sm leading-7"><b className="text-primary">✓ {title}</b> — {text}</p>)}</div></div><img src={media("whyImage", logoAsset.url)} alt="شعار LASHES ½" className="mx-auto aspect-square w-full max-w-md object-cover"/></div></section>

      <section {...section("reviews")} id="reviews" className="review-band py-16 text-primary-foreground md:py-20"><div className="mx-auto max-w-6xl px-4"><SectionTitle eyebrow="❤ آراء حقيقية" title={field("reviewsTitle", "عميلاتنا يحبّوننا")} subtitle="★★★★★ تقييم ٤.٨ من ٥ من أكثر من ٤٨٦ عميلة" light/><div className="mt-10 grid gap-5 md:grid-cols-3">{reviews.slice(0,3).map((review)=><article key={review.id} className="review-card"><span className="text-5xl text-primary-foreground/20">”</span><div className="text-amber-300">{"★".repeat(review.rating)}</div><p className="my-5 min-h-24 text-sm leading-7">{review.body}</p><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-primary font-bold">{review.customer_name[0]}</span><div><b>{review.customer_name}</b><small className="block text-primary-foreground/60">{review.city}</small></div></div><small className="mt-3 block text-emerald-300">✔ شراء موثّق</small></article>)}</div><div className="mt-12 grid grid-cols-3 text-center"><Stat value={486} suffix="+" label="عميلة سعيدة"/><Stat value={4.8} decimals={1} suffix="★" label="متوسط التقييم"/><Stat value={98} suffix="٪" label="ينصحون بها"/></div></div></section>

      <section {...section("services")} className="service-band py-10 text-primary-foreground"><div className="mx-auto grid max-w-6xl grid-cols-2 gap-7 px-4 text-center md:grid-cols-4">{[[Truck,"شحن سريع","استلمي طلبك خلال ٢-٤ أيام"],[ShieldCheck,"دفع آمن","حماية كاملة لبياناتك"],[Heart,"خدمة العملاء","نجيبك في أي وقت"],[Star,"ضمان الجودة","استبدال خلال ٧ أيام"]].map(([Icon,title,text])=>{const ServiceIcon=Icon as typeof Truck;return <div key={String(title)}><ServiceIcon className="mx-auto mb-3"/><b>{String(title)}</b><small className="mt-1 block text-primary-foreground/60">{String(text)}</small></div>})}</div></section>

      <section {...section("faq")} id="faq" className="bg-background py-16 md:py-20"><div className="mx-auto max-w-3xl px-4"><SectionTitle eyebrow="الأسئلة الشائعة" title={field("faqTitle", "كل ما تودّين معرفته عن LASHES ½")}/><Accordion type="single" collapsible className="mt-8">{[["sensitive",field("faqQuestion1", "هل المسكرة مناسبة للعيون الحساسة؟"),field("faqAnswer1", "نعم، تركيبتها خالية من القسوة ومناسبة لمن يلبسون العدسات اللاصقة.")],["delivery",field("faqQuestion2", "كم تستمر مدة التوصيل؟"),field("faqAnswer2", "يتم الشحن عبر سمسا أو أرامكس، ويصل الطلب خلال ٢-٤ أيام عمل داخل المملكة.")],["return",field("faqQuestion3", "ما سياسة الاستبدال والاسترجاع؟"),field("faqAnswer3", "يمكن استرجاع المنتج غير المستخدم خلال ٧ أيام من تاريخ الاستلام.")]].map(([id,title,text],index)=><AccordionItem value={id ?? String(index)} key={id ?? String(index)}><AccordionTrigger><span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{arNumber(index+1)}</span>{title}</span></AccordionTrigger><AccordionContent className="leading-7 text-muted-foreground">{text}</AccordionContent></AccordionItem>)}</Accordion><div className="mt-10 bg-blush p-7 text-center"><b className="block">ما لقيتي إجابة سؤالك؟</b><Button className="whatsapp-contact mt-4" asChild><a href="https://wa.me/966502203636" target="_blank" rel="noreferrer" aria-label="تواصلي معنا عبر واتساب"><span>تواصلي معنا</span><WhatsAppIcon /></a></Button></div></div></section>
    </main>

    <footer className="bg-footer px-4 py-14 text-primary-foreground"><div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3"><div><b className="font-editorial text-2xl">LASHES ½</b><p className="mt-4 text-sm leading-7 text-primary-foreground/65">جمالك يبدأ من عيونك. مسكرة رموش فاخرة بتركيبة عملية لإطلالة آسرة كل يوم.</p></div><div><b>روابط مهمة</b><p className="mt-4 text-sm leading-8 text-primary-foreground/65"><a href="#faq">الأسئلة الشائعة</a><br/><a href="#">تتبّع طلبك</a><br/><a href="#">طلب استرجاع</a><br/><a href="https://wa.me/966502203636">تواصل معنا</a></p></div><div><b>ابقِي على تواصل</b><p className="mt-4 text-sm leading-8 text-primary-foreground/65">واتساب: 0502203636<br/>المملكة العربية السعودية</p><p className="mt-5 text-xs text-primary-foreground/50">مدى · Visa · Mastercard · Apple Pay · STC Pay</p></div></div></footer>

    <a href="https://wa.me/966502203636" target="_blank" rel="noreferrer" className="whatsapp-float" aria-label="واتساب"><WhatsAppIcon /></a>
    <Sheet open={cartOpen} onOpenChange={setCartOpen}><SheetContent dir="rtl" side="right" className="cart-drawer flex w-full flex-col p-0 sm:max-w-[430px]"><SheetHeader className="cart-header"><SheetTitle className="font-editorial text-xl">سلة التسوق</SheetTitle><span className="cart-count">{arNumber(count)}</span></SheetHeader><div className="cart-items flex-1 overflow-y-auto">{cart.length === 0 ? <div className="cart-empty"><ShoppingBag/><b>سلتك فارغة</b><p>أضيفي منتجاتك المفضلة وارجعي هنا لإتمام طلبك.</p><Button variant="outline" onClick={() => setCartOpen(false)}>متابعة التسوق</Button></div> : cart.map((item)=>{const unitPrice=item.product.sale_price??item.product.regular_price;return <article key={item.product.id} className="cart-line"><img src={productDisplayImage(item.product)} alt={item.product.name_ar}/><div className="cart-line-details"><b>{item.product.name_ar}</b><small>مسكرة الرموش</small><div className="cart-price"><strong>{price(unitPrice)}</strong>{item.product.sale_price&&<del>{price(item.product.regular_price)}</del>}</div><div className="cart-line-actions"><div className="cart-quantity" aria-label={`كمية ${item.product.name_ar}`}><Button variant="ghost" size="icon" aria-label="زيادة الكمية" disabled={item.quantity>=item.product.stock} onClick={() => setQty(item.product.id,item.quantity+1)}><Plus/></Button><span aria-live="polite">{arNumber(item.quantity)}</span><Button variant="ghost" size="icon" aria-label="تقليل الكمية" onClick={() => item.quantity === 1 ? setCart((current)=>current.filter((row)=>row.product.id !== item.product.id)) : setQty(item.product.id,item.quantity-1)}><Minus/></Button></div><Button variant="ghost" size="icon" className="cart-remove" aria-label={`حذف ${item.product.name_ar}`} onClick={() => setCart((current)=>current.filter((row)=>row.product.id !== item.product.id))}><Trash2/></Button></div></div><strong className="cart-line-total">{price(unitPrice*item.quantity)}</strong></article>})}</div>{cart.length>0&&<div className="cart-summary"><div className="cart-shipping-note"><Truck/><span>{total>=150?"طلبك مؤهل للشحن المجاني":"أضيفي منتجات بقيمة "+price(150-total)+" لتحصلي على شحن مجاني"}</span></div><div className="cart-total"><span>المجموع</span><strong>{price(total)}</strong></div><p>الشحن والخصومات تُحسب عند إتمام الطلب</p><Button className="store-cta cart-checkout" onClick={() => { setCartOpen(false); setCheckout(true); }}>إتمام الطلب</Button><Button variant="outline" className="cart-continue" onClick={() => setCartOpen(false)}>متابعة التسوق</Button></div>}</SheetContent></Sheet>
    <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    {selectedProduct && <ProductDetails product={selectedProduct} quantity={selectedQuantity} related={packageProducts.filter((item) => item.id !== selectedProduct.id)} onQuantity={setSelectedQuantity} onSelect={(product) => { setSelectedProduct(product); setSelectedQuantity(1); window.scrollTo({ top: 0, behavior: "smooth" }); }} onClose={() => setSelectedProduct(null)} onAdd={() => addSelected(false)} onFastBuy={() => addSelected(true)} />}
    {checkout && <Checkout user={user} cart={cart} subtotal={total} onClose={() => setCheckout(false)} onDone={(number) => { setOrderDone(number); setCart([]); setCheckout(false); }} />}
    {orderDone && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/60 p-4"><div className="w-full max-w-sm rounded-lg bg-background p-8 text-center"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">✓</div><h2 className="font-editorial text-2xl font-bold">تم استلام طلبك</h2><p className="mt-3 text-muted-foreground">رقم الطلب: {orderDone}</p><Button className="store-cta mt-6 w-full" onClick={() => setOrderDone("")}>متابعة التسوق</Button></div></div>}
    {paymentNote && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/60 p-4"><div dir="rtl" className="w-full max-w-sm rounded-lg bg-background p-8 text-center"><h2 className="font-editorial text-xl font-bold">حالة الدفع</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{paymentNote}</p><Button className="store-cta mt-6 w-full" onClick={() => setPaymentNote("")}>حسناً</Button></div></div>}
  </div>;
}

function SectionTitle({ eyebrow, title, subtitle, light=false }: { eyebrow: string; title: string; subtitle?: string; light?: boolean }) { return <div className="text-center"><span className={`text-sm font-bold ${light ? "text-pink-light" : "text-primary"}`}>{eyebrow}</span><TypeText as="h2" text={title} className="font-editorial mt-2 text-3xl font-bold md:text-4xl"/>{subtitle && <p className={`mt-2 text-sm ${light ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{subtitle}</p>}</div>; }
function Stat({value,label,decimals=0,prefix="",suffix=""}:{value:number;label:string;decimals?:number;prefix?:string;suffix?:string}) { return <div><strong className="font-editorial text-3xl text-pink-light"><CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix}/></strong><small className="mt-1 block text-primary-foreground/60">{label}</small></div>; }

function WhatsAppIcon() { return <svg viewBox="0 0 448 512" role="img" aria-hidden="true"><path fill="currentColor" d="M380.9 97.1C339 55.1 283.2 32 223.9 32 101.5 32 2 131.5 2 253.9c0 44.9 11.7 88.6 33.9 127L0 480l101.6-35.5c37.1 20.3 78.9 31 121.4 31h.1c122.3 0 224.1-99.5 224.1-221.9 0-59.3-25.2-114.8-66.3-156.5zM223.9 438.1c-37.9 0-75-10.2-107.3-29.5l-7.7-4.6-60.3 21.1 20.3-58.8-5-8c-21.1-33.6-32.2-72.3-32.2-112.2 0-105.5 85.8-191.3 191.4-191.3 51.1 0 99.1 19.9 135.2 56.1 36.1 36.2 57.9 84.2 57.9 135.3-.1 105.5-86.7 191.9-192.3 191.9zm101.7-138.3c-5.6-2.8-33.1-16.3-38.2-18.2-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.4 18.2-17.6 21.9-3.2 3.7-6.5 4.2-12.1 1.4-32.6-16.3-54-29.1-75.6-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.3-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3s19.9 53.7 22.6 57.4c2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 33.1-13.5 37.7-26.5 4.6-13 4.6-24.1 3.2-26.5-1.3-2.5-5-3.9-10.3-6.7z"/></svg>; }
function ProductCard({ product, index, onAdd, image }: { product: Product; index: number; onAdd: (product: Product) => void; image?: string }) { const discount = product.sale_price ? Math.round((1-product.sale_price/product.regular_price)*100) : 0; return <article className="product-card"><div className="relative overflow-hidden rounded-t-lg"><img src={image ?? productDisplayImage(product)} alt={product.name_ar} loading="lazy" width={1024} height={1024} className="aspect-square w-full object-cover transition duration-500 hover:scale-105"/><span className="absolute right-2 top-2 rounded-full bg-store-dark px-2 py-1 text-[10px] text-primary-foreground">خصم {arNumber(discount)}٪</span>{index === 1 && <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-[10px] text-primary-foreground">الأكثر طلباً</span>}</div><div className="p-3 text-right"><div className="text-[10px] text-amber-500">★★★★★</div><h3 className="font-editorial mt-1 min-h-6 text-sm font-bold">{product.name_ar}</h3><p className="mt-1 text-sm font-bold text-primary">{price(product.sale_price ?? product.regular_price)} <del className="mr-2 text-[10px] font-normal text-muted-foreground">{price(product.regular_price)}</del></p>{product.stock <= product.low_stock_threshold && product.stock > 0 && <p className="mt-1 text-[10px] text-destructive">باقي {arNumber(product.stock)} فقط</p>}<Button className="store-cta mt-3 h-9 w-full text-xs" onClick={() => onAdd(product)} disabled={product.stock < 1}>{product.stock > 0 ? "أضيفي إلى السلة" : "نفد المخزون"}</Button></div></article>; }

function ProductDetails({ product, quantity, related, onQuantity, onSelect, onClose, onAdd, onFastBuy }: { product: Product; quantity: number; related: Product[]; onQuantity: (quantity: number) => void; onSelect: (product: Product) => void; onClose: () => void; onAdd: () => void; onFastBuy: () => void }) {
  const unitPrice = product.sale_price ?? product.regular_price;
  const message = encodeURIComponent(`مرحباً، أريد طلب ${product.name_ar}، الكمية: ${quantity}`);
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-background" dir="rtl">
    <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-10"><b className="font-editorial text-xl">LASHES <span className="text-primary">½</span></b><Button variant="ghost" size="icon" onClick={onClose} aria-label="العودة للمتجر"><X/></Button></div>
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <p className="mb-6 text-xs text-muted-foreground">الرئيسية / اختاري باقتك / {product.name_ar}</p>
      <div className="grid gap-8 md:grid-cols-2">
        <div><div className="relative overflow-hidden bg-blush"><img src={productDisplayImage(product)} alt={product.name_ar} className="aspect-square w-full object-cover"/><span className="absolute right-3 top-3 rounded-full bg-background px-3 py-1 text-xs">تخفيضات</span></div><div className="mt-3 grid grid-cols-4 gap-2">{[0,1,2,3].map((item)=><img key={item} src={productDisplayImage(product)} alt="" className={`aspect-square w-full object-cover ${item === 0 ? "ring-2 ring-primary" : "opacity-70"}`}/>)}</div></div>
        <div><p className="text-xs font-bold text-primary">المسكرة الأكثر مبيعاً</p><h1 className="font-editorial mt-2 text-2xl font-bold md:text-3xl">{product.name_ar}</h1><div className="mt-3 text-sm text-amber-500">★★★★★ <span className="text-muted-foreground">(٤٨٦ تقييم)</span></div><div className="mt-4 flex items-center gap-3"><strong className="text-2xl text-primary">{price(unitPrice)}</strong>{product.sale_price && <del className="text-muted-foreground">{price(product.regular_price)}</del>}</div><p className="mt-5 text-sm leading-7 text-muted-foreground">باقة عناية متكاملة تمنح رموشك طولاً وكثافة من أول استخدام مع ثبات يدوم طوال اليوم.</p><p className="mt-4 text-sm font-bold text-emerald-600">حالة المخزون: {arNumber(product.stock)} متوفر في المخزون</p>
          <div className="mt-5 flex gap-3"><div className="cart-quantity"><Button variant="ghost" size="icon" onClick={() => onQuantity(Math.min(product.stock,quantity+1))}><Plus/></Button><span>{arNumber(quantity)}</span><Button variant="ghost" size="icon" onClick={() => onQuantity(Math.max(1,quantity-1))}><Minus/></Button></div><Button className="store-cta h-11 flex-1" onClick={onAdd}>إضافة إلى السلة</Button></div>
          <Button className="mt-4 h-11 w-full bg-store-dark text-primary-foreground hover:bg-store-dark/90" onClick={onFastBuy}>⚡ اشتري الآن - دفع سريع</Button>
          <Button className="mt-3 h-11 w-full bg-emerald-500 text-primary-foreground hover:bg-emerald-600" asChild><a href={`https://wa.me/966502203636?text=${message}`} target="_blank" rel="noreferrer"><WhatsAppIcon/> اطلبي عبر الواتساب</a></Button>
          <div className="mt-5 grid grid-cols-2 gap-3 border bg-blush p-4 text-center text-xs"><span>🎁<b className="block">دفع عند الاستلام</b>متاح داخل المملكة</span><span>🚚<b className="block">شحن مجاني</b>للطلبات فوق ١٥٠ ر.س</span><span>⚡<b className="block">توصيل ٢-٤ أيام</b>داخل المملكة</span><span>↩️<b className="block">استبدال سهل</b>خلال ٧ أيام</span></div>
          <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">رمز المنتج: {product.sku} &nbsp; · &nbsp; التصنيف: مسكرة الرموش</p>
        </div>
      </div>
      <div className="mt-12 border-t pt-6"><h2 className="border-b-2 border-primary pb-3 font-bold">الوصف</h2><p className="py-5 text-sm leading-8 text-muted-foreground">باقة {product.name_ar} من LASHES ½ — مثالية لكِ ولصديقاتك، تمنح الرموش طولاً وكثافة ومظهراً جذاباً بتركيبة خفيفة وسهلة الإزالة.</p></div>
      {related.length > 0 && <section className="mt-8"><h2 className="font-editorial mb-5 text-2xl font-bold">قد يعجبك أيضاً...</h2><div className="grid max-w-xl grid-cols-2 gap-4">{related.slice(0,2).map((item,index)=><ProductCard key={item.id} product={item} index={index} onAdd={onSelect}/>)}</div></section>}
    </div>
  </div>;
}

function Checkout({ user, cart, subtotal, onClose, onDone }: { user: User | null; cart: CartItem[]; subtotal: number; onClose: () => void; onDone: (number: string) => void }) {
  const [form, setForm] = useState({ name: String(user?.user_metadata?.["full_name"] ?? ""), phone: "", city: "الرياض", address: "", notes: "" });
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{ id:string; discount_type:string; discount_value:number } | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [shipping, setShipping] = useState<ShippingMethod[]>([]);
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [shippingId, setShippingId] = useState("");
  const [paymentCode, setPaymentCode] = useState("cod");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void Promise.all([supabase.from("shipping_methods").select("id,name_ar,price,free_shipping_threshold,estimated_days_min,estimated_days_max").eq("is_active",true),supabase.from("payment_methods").select("id,code,name_ar").eq("is_active",true).order("sort_order")]).then(([s,p])=>{setShipping((s.data??[]) as ShippingMethod[]);setPayments((p.data??[]) as PaymentMethod[]);if(s.data?.[0])setShippingId(s.data[0].id);if(p.data?.[0])setPaymentCode(p.data[0].code);}); }, []);
  const chosenShipping = shipping.find((item) => item.id === shippingId);
  const shippingAmount = chosenShipping && (!chosenShipping.free_shipping_threshold || subtotal < chosenShipping.free_shipping_threshold) ? Number(chosenShipping.price) : 0;
  const discount = coupon ? Math.min(subtotal, coupon.discount_type === "percentage" ? subtotal * coupon.discount_value / 100 : coupon.discount_value) : 0;
  const total = Math.max(0, subtotal - discount + shippingAmount);
  const applyCoupon = async () => { const code=couponCode.trim().toUpperCase(); const {data}=await supabase.from("coupons").select("id,discount_type,discount_value,minimum_order,usage_limit,usage_count,starts_at,ends_at").eq("code",code).eq("is_active",true).maybeSingle(); const now=Date.now(); if(!data || subtotal<Number(data.minimum_order) || (data.usage_limit!==null&&data.usage_count>=data.usage_limit) || (data.starts_at&&new Date(data.starts_at).getTime()>now) || (data.ends_at&&new Date(data.ends_at).getTime()<now)){setCoupon(null);setCouponMessage("الكوبون غير صالح لهذا الطلب");return} setCoupon({id:data.id,discount_type:data.discount_type,discount_value:Number(data.discount_value)});setCouponMessage("تم تطبيق الخصم"); };
  const place = async () => { if (!chosenShipping) { setError("اختاري طريقة الشحن"); return; } setBusy(true); setError(""); const number=`L12-${Date.now().toString().slice(-7)}`; const {error:orderError}=await supabase.rpc("place_store_order",{_order_number:number,_customer_name:form.name,_customer_phone:form.phone,_customer_email:user?.email??"",_shipping_address:{city:form.city,address:form.address},_shipping_method_id:chosenShipping.id,_payment_code:paymentCode,_coupon_code:coupon?couponCode.trim().toUpperCase():"",_notes:form.notes,_items:cart.map((item)=>({product_id:item.product.id,quantity:item.quantity}))}); if(orderError){setError(orderError.message.includes("stock")?"نفدت كمية أحد المنتجات، حدّثي السلة وحاولي مرة أخرى":"تعذّر إنشاء الطلب، تحققي من البيانات وحاولي مرة أخرى");setBusy(false);return}
    if (paymentCode === "tabby") {
      const session = await createTabbyCheckout({ data: { orderNumber: number, origin: window.location.origin } }).catch(() => null);
      if (session?.url) { sessionStorage.setItem("lash-tabby-phone", form.phone); sessionStorage.setItem("lash-tabby-name", form.name); window.location.assign(session.url); return; }
      setError(session?.error === "rejected" ? "تابي غير متاح لهذا الطلب حالياً، اختاري طريقة دفع أخرى" : "تعذّر بدء الدفع عبر تابي، حاولي مرة أخرى أو اختاري طريقة دفع أخرى");
      setBusy(false); return;
    }
    void sendOrderConfirmation({ data: { phone: form.phone, orderNumber: number, customerName: form.name, total } }).catch(() => undefined); onDone(number); setBusy(false); };
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/60 p-3"><div dir="rtl" className="mx-auto my-5 w-full max-w-4xl rounded-lg bg-background p-5 md:p-8"><div className="mb-6 flex justify-between"><div><p className="text-xs font-bold text-primary">إتمام الطلب</p><h2 className="font-editorial text-3xl font-bold">بيانات الشحن والدفع</h2></div><Button variant="ghost" size="icon" onClick={onClose}><X/></Button></div>{!user&&<div className="mb-5 bg-blush p-4 text-sm">يمكنك إتمام الطلب بدون تسجيل دخول — يكفي الاسم ورقم الجوال والعنوان، وسيصلك تأكيد الطلب على جوالك.</div>}<div className="grid gap-8 md:grid-cols-[1.3fr_.8fr]"><div><div className="grid gap-4 sm:grid-cols-2"><Field label="الاسم الكامل" value={form.name} onChange={(name)=>setForm({...form,name})}/><Field label="رقم الجوال" value={form.phone} onChange={(phone)=>setForm({...form,phone})}/><Field label="المدينة" value={form.city} onChange={(city)=>setForm({...form,city})}/><Field label="العنوان بالتفصيل" value={form.address} onChange={(address)=>setForm({...form,address})}/></div><label className="mt-4 block space-y-1 text-sm"><span>ملاحظات الطلب</span><Input value={form.notes} onChange={(event)=>setForm({...form,notes:event.target.value})}/></label><div className="mt-6"><b>طريقة الشحن</b><Select value={shippingId} onValueChange={setShippingId}><SelectTrigger className="mt-2"><SelectValue placeholder="اختاري طريقة الشحن"/></SelectTrigger><SelectContent>{shipping.map((item)=><SelectItem key={item.id} value={item.id}>{item.name_ar} — {price(Number(item.price))}</SelectItem>)}</SelectContent></Select></div><div className="mt-6"><b>طريقة الدفع</b><div className="mt-2 grid gap-2">{payments.map((item)=><Button key={item.id} variant={paymentCode===item.code?"default":"outline"} className="justify-start" onClick={()=>setPaymentCode(item.code)}>{item.name_ar}</Button>)}</div></div></div><aside className="bg-blush p-5"><h3 className="font-bold">ملخص الطلب</h3>{cart.map((item)=><div key={item.product.id} className="flex justify-between border-b py-3 text-sm"><span>{item.product.name_ar} × {arNumber(item.quantity)}</span><b>{price((item.product.sale_price??item.product.regular_price)*item.quantity)}</b></div>)}<div className="mt-4 flex gap-2"><Input placeholder="كود الخصم" value={couponCode} onChange={(event)=>setCouponCode(event.target.value)}/><Button variant="outline" onClick={()=>void applyCoupon()}>تطبيق</Button></div>{couponMessage&&<p className={`mt-2 text-xs ${coupon?"text-emerald-600":"text-destructive"}`}>{couponMessage}</p>}<div className="mt-5 space-y-2 text-sm"><div className="flex justify-between"><span>المجموع</span><span>{price(subtotal)}</span></div>{discount>0&&<div className="flex justify-between text-emerald-600"><span>الخصم</span><span>- {price(discount)}</span></div>}<div className="flex justify-between"><span>الشحن</span><span>{shippingAmount?price(shippingAmount):"مجاني"}</span></div><div className="flex justify-between border-t pt-3 text-lg font-bold"><span>الإجمالي</span><span>{price(total)}</span></div></div>{error&&<p className="mt-3 text-sm text-destructive">{error}</p>}<Button className="store-cta mt-5 h-12 w-full" disabled={busy||!form.name||!form.phone||!form.address||!shippingId} onClick={()=>void place()}>{busy?"جارٍ تأكيد الطلب...":"تأكيد الطلب"}</Button></aside></div></div></div>;
}
function Field({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}) { return <label className="space-y-1 text-sm"><span>{label}</span><Input value={value} onChange={(event)=>onChange(event.target.value)}/></label>; }
