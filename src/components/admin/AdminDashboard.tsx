import { useEffect, useMemo, useState } from "react";
import { SupportWidget } from "@/components/SupportWidget";
import { CustomersPage } from "@/components/admin/CustomersPage";
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const install = async () => {
    if (deferred) { await deferred.prompt(); const choice = await deferred.userChoice; if (choice.outcome === "accepted") setDeferred(null); }
    else alert("من متصفح كروم: افتح قائمة النقاط ⋮ ثم اختر «تثبيت التطبيق» أو «إضافة إلى سطح المكتب».");
  };
  return <Button variant="outline" size="sm" className="gap-2" onClick={() => void install()}><Download className="size-4" />تثبيت التطبيق</Button>;
}

function Placeholder({ title, desc, icon: Icon }: { title: string; desc: string; icon: typeof Store }) {
  return <div className="grid min-h-80 place-items-center"><div className="max-w-md rounded-lg border bg-card p-10 text-center shadow-sm"><span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="size-7" /></span><h2 className="text-xl font-bold">{title}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{desc}</p></div></div>;
}
import {
  BarChart3, Boxes, ChevronDown, ChevronLeft, CircleDollarSign, CircleHelp, ClipboardList, CreditCard, Download, FileText, Gem, Gift, Handshake, Home, Info,
  LayoutDashboard, LogOut, MapPin, Megaphone, Menu, MessageCircle, Moon, Package, Plus, Search, Settings, Share2, Sun, PanelsTopLeft,
  ShoppingBag, Sparkles, Star, Store, Tag, Trash2, Truck, Users, WalletCards, X, FolderTree, Upload,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { OrdersPage } from "@/components/admin/OrdersPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { orderStatus, sar, type Product } from "@/lib/store";
import { ReferenceDashboard } from "@/components/admin/ReferenceDashboard";
import ReportsPage from "@/components/admin/ReportsPage";
import { ProductsPage } from "@/components/admin/ProductsPage";
import { MarketingToolsPage } from "@/components/admin/MarketingToolsPage";
import { MarketingCampaignsPage } from "@/components/admin/MarketingCampaignsPage";
import { StaffPhonesPage } from "@/components/admin/StaffPhonesPage";
import { SiteEditorPage } from "@/components/admin/SiteEditorPage";
import { useLang } from "@/lib/i18n";


type Section = "overview" | "orders" | "products" | "categories" | "customers" | "inventory" | "coupons" | "marketing" | "reports" | "shipping" | "payments" | "settings" | "campaigns" | "staff" | "site-editor";
type Order = { id: string; order_number: string; customer_id?: string | null; customer_name: string; customer_phone: string; total: number; payment_method: string; shipping_method: string; status: string; created_at: string; order_items?: { product_name: string; quantity: number }[] };
type Customer = { id: string; full_name: string | null; phone: string | null; email: string | null; orders_count: number; total_spent: number; address?: unknown; notes?: string | null; status?: string | null; last_order_at?: string | null };
type Coupon = { id: string; code: string; discount_type: string; discount_value: number; minimum_order: number; usage_limit: number | null; usage_count: number; is_active: boolean; starts_at: string | null; ends_at: string | null };
type Category = { id: string; name_ar: string; name_en: string | null; slug: string; image_url: string | null; is_active: boolean; sort_order: number };
type Review = { id: string; customer_name: string; rating: number; body: string; status: string; admin_reply: string | null; created_at: string; product_id: string; products?: { name_ar: string } | null };

type NavItem = { id: Section; label: string; labelEn: string; icon: typeof Store };
const navGroups: { title?: string; titleEn?: string; items: NavItem[] }[] = [
  { items: [
    { id: "overview", label: "الرئيسية", labelEn: "Home", icon: LayoutDashboard },
    { id: "orders", label: "الطلبات", labelEn: "Orders", icon: ClipboardList },
    { id: "customers", label: "العملاء", labelEn: "Customers", icon: Users },
    { id: "site-editor", label: "محرّر الموقع", labelEn: "Site editor", icon: PanelsTopLeft },
  ] },
  { title: "الكتالوج", titleEn: "Catalog", items: [
    { id: "products", label: "المنتجات", labelEn: "Products", icon: Package },
    { id: "categories", label: "التصنيفات", labelEn: "Categories", icon: FolderTree },
    { id: "inventory", label: "المخزون", labelEn: "Inventory", icon: Boxes },
  ] },
  { title: "النمو", titleEn: "Growth", items: [
    { id: "marketing", label: "التسويق والخصومات", labelEn: "Marketing & discounts", icon: Megaphone },
    { id: "reports", label: "التقارير", labelEn: "Reports", icon: BarChart3 },
  ] },
  { title: "الإعدادات", titleEn: "Settings", items: [
    { id: "settings", label: "إعدادات المتجر", labelEn: "Store settings", icon: Settings },
    { id: "staff", label: "الموظفين", labelEn: "Staff", icon: Users },
    { id: "shipping", label: "الشحن", labelEn: "Shipping", icon: Truck },
    { id: "payments", label: "طرق الدفع", labelEn: "Payment methods", icon: CreditCard },
  ] },
];
const nav = navGroups.flatMap((g) => g.items);

export function AdminDashboard({ onSignOut, userEmail = "" }: { onSignOut: () => Promise<void>; userEmail?: string }) {
  const { t, lang, dir, toggleLang } = useLang();
  const [section, setSection] = useState<Section>("overview");

  const [mobileNav, setMobileNav] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<Section>("orders");
  const accountName = (userEmail.split("@")[0] || "Admin").replace(/^./, (c) => c.toUpperCase());
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [productModal, setProductModal] = useState(false);
  const [couponModal, setCouponModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(() => localStorage.getItem("lash-admin-dark") === "1");
  const toggleDark = () => setDark((d) => { localStorage.setItem("lash-admin-dark", d ? "0" : "1"); return !d; });

  const load = async () => {
    setLoading(true);
    const [p, o, c, cp, r, cats] = await Promise.all([
      supabase.from("products").select("*, product_images(image_url,alt_text)").order("created_at", { ascending: false }),
      supabase.from("orders").select("*, order_items(product_name,quantity)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,phone,email,orders_count,total_spent,address,notes,status,last_order_at").order("created_at", { ascending: false }),
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("reviews").select("*, products(name_ar)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
    ]);
    setProducts((p.data ?? []) as Product[]); setOrders((o.data ?? []) as Order[]); setCustomers((c.data ?? []) as Customer[]);
    setCoupons((cp.data ?? []) as Coupon[]); setReviews((r.data ?? []) as Review[]); setCategories((cats.data ?? []) as Category[]); setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const channel = supabase.channel("admin-live").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, load).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const title = nav.find((item) => item.id === section)?.label ?? "الرئيسية";
  const totalSales = orders.filter((o) => !["cancelled", "refunded"].includes(o.status)).reduce((sum, o) => sum + Number(o.total), 0);
  const today = new Date().toDateString();
  const todaySales = orders.filter((o) => new Date(o.created_at).toDateString() === today).reduce((sum, o) => sum + Number(o.total), 0);
  const chart = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - index));
    return { name: d.toLocaleDateString("ar-SA", { weekday: "short" }), sales: orders.filter((o) => new Date(o.created_at).toDateString() === d.toDateString()).reduce((s, o) => s + Number(o.total), 0) };
  }), [orders]);

  const renderContent = () => {
    if (loading) return <div className="grid min-h-80 place-items-center text-muted-foreground">جارٍ تحميل بيانات المتجر...</div>;
    if (section === "overview") return <ReferenceDashboard orders={orders} products={products} customerCount={customers.length} onOpenOrders={() => setSection("orders")} onOpenProducts={() => setSection("products")} />;
    if (section === "reports") return <ReportsPage orders={orders} products={products} customers={customers as never} />;
    if (section === "orders") return <OrdersPage orders={orders} products={products} initialSearch={searchFilter === "orders" ? searchQuery : ""} onReload={load} onUpdate={async (id, status) => { await supabase.from("orders").update({ status: status as never }).eq("id", id); await load(); }} />;
    if (section === "categories") return <Categories categories={categories} onAdd={()=>{setEditingCategory(null);setCategoryModal(true)}} onEdit={(category)=>{setEditingCategory(category);setCategoryModal(true)}} onDelete={async(id)=>{if(confirm("هل تريد حذف التصنيف؟")){await supabase.from("categories").delete().eq("id",id);await load()}}}/>;
    if (section === "products") return <ProductsPage products={products} categories={categories} search={search} setSearch={setSearch} onSaved={load} onDelete={async (id) => { if (confirm("هل تريد حذف المنتج؟")) { await supabase.from("products").delete().eq("id", id); await load(); } }} />;
    if (section === "inventory") return <Inventory products={products} />;
    if (section === "customers") return <CustomersPage customers={customers} orders={orders} initialSearch={searchFilter === "customers" ? searchQuery : ""} onChanged={load} />;
    if (section === "coupons") return <Coupons coupons={coupons} onAdd={() => setCouponModal(true)} onToggle={async (id, active) => { await supabase.from("coupons").update({ is_active: active }).eq("id", id); await load(); }} />;
    if (section === "shipping") return <ShippingSettings />;
    if (section === "payments") return <PaymentSettings />;
    if (section === "settings") return <StoreSettings />;
    if (section === "staff") return <StaffPhonesPage />;
    if (section === "site-editor") return <SiteEditorPage />;
    if (section === "marketing") return <MarketingToolsPage onNavigate={setSection} />;
    if (section === "campaigns") return <MarketingCampaignsPage />;
    return <ReferenceDashboard orders={orders} products={products} customerCount={customers.length} onOpenOrders={() => setSection("orders")} onOpenProducts={() => setSection("products")} />;
  };

  return <div dir={dir} className={`admin-theme min-h-screen bg-admin-bg text-foreground ${dark ? "admin-dark" : ""}`}>
    <aside className={`fixed start-0 top-0 z-40 flex h-screen w-56 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform ${mobileNav ? "translate-x-0" : "max-lg:rtl:translate-x-full max-lg:ltr:-translate-x-full"}`}>
      <div className="flex items-center gap-3 px-5 pb-4 pt-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[oklch(0.83_0.13_350)] text-lg font-bold text-white">½</span>
        <div className="min-w-0 flex-1">
          <b className="block text-base tracking-wide text-white">LASHES 1/2</b>
          <a href="/" target="_blank" className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1 text-[11px] text-sidebar-foreground hover:text-sidebar-primary"><Share2 className="size-3" />{t("زيارة المتجر", "Visit store")}<ChevronLeft className="size-3 rtl:rotate-0 ltr:rotate-180" /></a>
        </div>
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNav(false)}><X /></Button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">{navGroups.map((group, gi) => <div key={gi} className={gi ? "mt-4" : ""}>{group.title && <p className="mb-1 px-3 text-xs font-semibold text-sidebar-primary/80">{t(group.title, group.titleEn)}</p>}{group.items.map(({ id, label, labelEn, icon: Icon }) => <button key={id} type="button" onClick={() => { setSection(id); setMobileNav(false); }} className={`mb-0.5 flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm transition-colors ${section === id ? "bg-sidebar-accent font-semibold text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/60"}`}><Icon className="size-[18px]" /><span className="flex-1 text-start">{t(label, labelEn)}</span></button>)}</div>)}</nav>
      <div className="border-t border-sidebar-border p-3"><button type="button" className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground hover:bg-sidebar-accent/60" onClick={() => void onSignOut()}><LogOut className="size-[18px]" />{t("تسجيل الخروج", "Sign out")}</button></div>
    </aside>
     <main className="lg:ms-56"><header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 md:px-6"><Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileNav(true)}><Menu /></Button>
       <div className="flex w-full max-w-md items-center gap-1 rounded-md border bg-background px-1"><Search className="mx-2 size-4 shrink-0 text-muted-foreground" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setSection(searchFilter); if (searchFilter === "products") setSearch(searchQuery); } }} className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0" placeholder={t("ابحث برقم الطلب أو اسم العميل أو المنتج", "Search by order number, customer or product")} /><span className="mx-1 h-5 w-px bg-border" /><select value={searchFilter} onChange={(e) => setSearchFilter(e.target.value as Section)} className="h-8 cursor-pointer bg-transparent px-1 text-xs text-muted-foreground outline-none"><option value="orders">{t("الطلبات", "Orders")}</option><option value="products">{t("المنتجات", "Products")}</option><option value="customers">{t("العملاء", "Customers")}</option></select><span title={t("اضغط Enter للبحث", "Press Enter to search")}><Info className="mx-1 size-4 shrink-0 text-muted-foreground" /></span></div>
      <div className="ms-auto flex items-center gap-1.5"><Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full px-3 text-xs font-semibold" onClick={() => window.location.assign("/")} title={t("العودة إلى الصفحة الرئيسية", "Back to home page")}><Home className="size-4" /><span className="hidden sm:inline">{t("الرئيسية", "Home")}</span></Button><Button variant="outline" size="sm" className="h-9 rounded-full px-3 text-xs font-bold" onClick={toggleLang} title={t("تغيير اللغة", "Change language")}>{lang === "ar" ? "EN" : "ع"}</Button><Button variant="ghost" size="icon" className="rounded-full border" onClick={toggleDark} title={dark ? t("الوضع الفاتح", "Light mode") : t("الوضع الداكن", "Dark mode")}>{dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}</Button><DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="flex items-center gap-1.5 rounded-full px-1.5 py-1 hover:bg-muted/60"><div className="grid size-9 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{accountName.slice(0, 1)}</div><span className="hidden max-w-24 truncate text-sm font-medium md:inline" dir="ltr">{accountName}</span><ChevronDown className="hidden size-4 text-muted-foreground md:block" /></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-52"><div className="px-2 py-2"><p className="text-sm font-semibold">{accountName}</p><p className="truncate text-xs text-muted-foreground" dir="ltr">{userEmail}</p></div><DropdownMenuSeparator /><DropdownMenuItem className="gap-2" onClick={() => window.location.assign("/")}><Home className="size-4" />{t("العودة إلى المتجر", "Back to store")}</DropdownMenuItem><DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => void onSignOut()}><LogOut className="size-4" />{t("تسجيل الخروج", "Sign out")}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
      <span className="sr-only">{t(title, nav.find((item) => item.id === section)?.labelEn)}</span>
    </header>
      <div className="flex justify-start px-4 pt-3 md:px-5"><Button size="sm" className="gap-1.5 rounded-full" onClick={() => document.getElementById("support-widget-trigger")?.click()}><CircleHelp className="size-4" />{t("مساعدة", "Help")}</Button></div>

      <div className="p-4 md:p-5">{renderContent()}</div>
    </main>
    <ProductDialog open={productModal} editing={editing} categories={categories} onOpenChange={setProductModal} onSaved={load} />
    <CategoryDialog open={categoryModal} editing={editingCategory} onOpenChange={setCategoryModal} onSaved={load} />
    <CouponDialog open={couponModal} onOpenChange={setCouponModal} onSaved={load} />
    <SupportWidget />
  </div>;
}

function Metric({ label, value, icon: Icon, note }: { label: string; value: string; icon: typeof Store; note?: string }) { return <div className="rounded-lg border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary"><Icon /></span></div><strong className="text-2xl">{value}</strong>{note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}</div>; }
function Overview({ totalSales, todaySales, orders, customers, products, chart, reports }: { totalSales: number; todaySales: number; orders: Order[]; customers: Customer[]; products: Product[]; chart: {name:string;sales:number}[]; reports:boolean }) {
  const metrics = [{label:"مبيعات اليوم",value:sar(todaySales),icon:CircleDollarSign},{label:"إجمالي المبيعات",value:sar(totalSales),icon:BarChart3},{label:"الطلبات",value:String(orders.length),icon:ShoppingBag},{label:"طلبات جديدة",value:String(orders.filter(o=>o.status==="new").length),icon:ClipboardList},{label:"العملاء",value:String(customers.length),icon:Users},{label:"متوسط الطلب",value:sar(orders.length ? totalSales/orders.length : 0),icon:Gift}];
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(m=><Metric key={m.label} {...m}/>)}</div><div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]"><section className="rounded-lg border bg-card p-5"><h2 className="mb-5 font-bold">{reports ? "تقرير المبيعات الأسبوعي" : "المبيعات خلال 7 أيام"}</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><defs><linearGradient id="sales" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={.35}/><stop offset="100%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Area type="monotone" dataKey="sales" stroke="var(--primary)" fill="url(#sales)" strokeWidth={2}/></AreaChart></ResponsiveContainer></div></section><section className="rounded-lg border bg-card p-5"><h2 className="mb-4 font-bold">الأكثر مبيعاً</h2>{products.filter(p=>p.is_bestseller).slice(0,5).map(p=><div key={p.id} className="flex items-center justify-between border-b py-3 last:border-0"><div><b>{p.name_ar}</b><p className="text-xs text-muted-foreground">{p.sku}</p></div><span className="font-semibold">{sar(p.sale_price ?? p.regular_price)}</span></div>)}</section></div><section className="rounded-lg border bg-card p-5"><h2 className="mb-4 font-bold">أحدث الطلبات</h2><OrdersTable orders={orders.slice(0,6)} /></section></div>;
}
function OrdersTable({orders,onUpdate}:{orders:Order[];onUpdate?:(id:string,s:string)=>void}) { return <Table><TableHeader><TableRow><TableHead>الطلب</TableHead><TableHead>العميل</TableHead><TableHead>المنتجات</TableHead><TableHead>الإجمالي</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader><TableBody>{orders.map(o=><TableRow key={o.id}><TableCell className="font-semibold">#{o.order_number}</TableCell><TableCell>{o.customer_name}<small className="block text-muted-foreground">{o.customer_phone}</small></TableCell><TableCell>{o.order_items?.map(i=>`${i.product_name} × ${i.quantity}`).join("، ") || "—"}</TableCell><TableCell>{sar(Number(o.total))}</TableCell><TableCell>{onUpdate?<Select value={o.status} onValueChange={v=>onUpdate(o.id,v)}><SelectTrigger className="w-36"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(orderStatus).map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>:<span className="rounded-full bg-muted px-2 py-1 text-xs">{orderStatus[o.status]}</span>}</TableCell><TableCell>{new Date(o.created_at).toLocaleDateString("ar-SA")}</TableCell></TableRow>)}</TableBody></Table> }
function Orders({orders,onUpdate}:{orders:Order[];onUpdate:(id:string,s:string)=>void}) { const [filter,setFilter]=useState("all"); const list=filter==="all"?orders:orders.filter(o=>o.status===filter); return <section className="rounded-lg border bg-card p-5"><div className="mb-5 flex flex-wrap gap-2"><Button size="sm" variant={filter==="all"?"default":"outline"} onClick={()=>setFilter("all")}>الكل</Button>{Object.entries(orderStatus).map(([v,l])=><Button key={v} size="sm" variant={filter===v?"default":"outline"} onClick={()=>setFilter(v)}>{l}</Button>)}</div><OrdersTable orders={list} onUpdate={onUpdate}/></section> }
function Categories({categories,onAdd,onEdit,onDelete}:{categories:Category[];onAdd:()=>void;onEdit:(category:Category)=>void;onDelete:(id:string)=>void}){return <section className="rounded-lg border bg-card p-5"><div className="mb-5 flex justify-end"><Button onClick={onAdd}><Plus/>إضافة تصنيف</Button></div><Table><TableHeader><TableRow><TableHead>التصنيف</TableHead><TableHead>الرابط</TableHead><TableHead>الترتيب</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader><TableBody>{categories.map(c=><TableRow key={c.id}><TableCell className="font-semibold">{c.name_ar}</TableCell><TableCell>{c.slug}</TableCell><TableCell>{c.sort_order}</TableCell><TableCell>{c.is_active?"نشط":"غير نشط"}</TableCell><TableCell><div className="flex gap-1"><Button size="sm" variant="outline" onClick={()=>onEdit(c)}>تعديل</Button><Button size="icon" variant="ghost" onClick={()=>onDelete(c.id)}><Trash2/></Button></div></TableCell></TableRow>)}</TableBody></Table></section>}
function CategoryDialog({open,editing,onOpenChange,onSaved}:{open:boolean;editing:Category|null;onOpenChange:(v:boolean)=>void;onSaved:()=>Promise<void>}){const [f,setF]=useState({name_ar:"",name_en:"",slug:"",sort_order:"0",is_active:true});useEffect(()=>setF(editing?{name_ar:editing.name_ar,name_en:editing.name_en??"",slug:editing.slug,sort_order:String(editing.sort_order),is_active:editing.is_active}:{name_ar:"",name_en:"",slug:"",sort_order:"0",is_active:true}),[editing,open]);const save=async()=>{const payload={name_ar:f.name_ar,name_en:f.name_en||null,slug:f.slug,sort_order:Number(f.sort_order),is_active:f.is_active};if(editing)await supabase.from("categories").update(payload).eq("id",editing.id);else await supabase.from("categories").insert(payload);onOpenChange(false);await onSaved()};return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{editing?"تعديل التصنيف":"إضافة تصنيف"}</DialogTitle></DialogHeader><Input placeholder="الاسم بالعربية" value={f.name_ar} onChange={e=>setF({...f,name_ar:e.target.value})}/><Input placeholder="الاسم بالإنجليزية" value={f.name_en} onChange={e=>setF({...f,name_en:e.target.value})}/><Input placeholder="الرابط المختصر" value={f.slug} onChange={e=>setF({...f,slug:e.target.value})}/><Input type="number" placeholder="الترتيب" value={f.sort_order} onChange={e=>setF({...f,sort_order:e.target.value})}/><label className="flex items-center justify-between">نشط<Switch checked={f.is_active} onCheckedChange={is_active=>setF({...f,is_active})}/></label><Button onClick={()=>void save()} disabled={!f.name_ar||!f.slug}>حفظ التصنيف</Button></DialogContent></Dialog>}
function Inventory({products}:{products:Product[]}) { return <div className="space-y-4"><div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"><b>{products.filter(p=>p.stock<=p.low_stock_threshold).length} منتجات</b> وصلت إلى حد المخزون المنخفض.</div><section className="rounded-lg border bg-card p-5"><Table><TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead>SKU</TableHead><TableHead>المتاح</TableHead><TableHead>حد التنبيه</TableHead></TableRow></TableHeader><TableBody>{products.map(p=><TableRow key={p.id}><TableCell>{p.name_ar}</TableCell><TableCell>{p.sku}</TableCell><TableCell className={p.stock<=p.low_stock_threshold?"font-bold text-destructive":"font-bold"}>{p.stock}</TableCell><TableCell>{p.low_stock_threshold}</TableCell></TableRow>)}</TableBody></Table></section></div> }
const NA = "غير مضاف";
const txt = (value: unknown) => { const s = typeof value === "string" ? value.trim() : ""; return s || NA; };
const addressText = (value: unknown) => {
  if (!value || typeof value !== "object") return NA;
  const parts = Object.values(value as Record<string, unknown>).filter((v) => typeof v === "string" && v.trim()).join("، ");
  return parts || NA;
};
const dateText = (value?: string | null) => value ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(value)) : NA;

function Field({label,value,ltr}:{label:string;value:string;ltr?:boolean}) { return <div className="rounded-md border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium" dir={ltr?"ltr":undefined}>{value}</p></div> }
function Coupons({coupons,onAdd,onToggle}:{coupons:Coupon[];onAdd:()=>void;onToggle:(id:string,a:boolean)=>void}) { return <section className="rounded-lg border bg-card p-5"><div className="mb-5 flex justify-between"><p className="text-sm text-muted-foreground">إدارة أكواد الخصم وحدود استخدامها</p><Button onClick={onAdd}><Plus/>كوبون جديد</Button></div><Table><TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الخصم</TableHead><TableHead>الحد الأدنى</TableHead><TableHead>الاستخدام</TableHead><TableHead>نشط</TableHead></TableRow></TableHeader><TableBody>{coupons.map(c=><TableRow key={c.id}><TableCell className="font-mono font-bold">{c.code}</TableCell><TableCell>{c.discount_type==="percentage"?`${c.discount_value}%`:sar(c.discount_value)}</TableCell><TableCell>{sar(c.minimum_order)}</TableCell><TableCell>{c.usage_count} / {c.usage_limit??"∞"}</TableCell><TableCell><Switch checked={c.is_active} onCheckedChange={v=>onToggle(c.id,v)}/></TableCell></TableRow>)}</TableBody></Table></section> }
function Reviews({reviews,products,onStatus,onDelete}:{reviews:Review[];products:Product[];onStatus:(id:string,s:string)=>void;onDelete:(id:string)=>void}) {
  const [filter,setFilter]=useState("all");
  const statusLabel:Record<string,string>={pending:"بانتظار المراجعة",approved:"منشور",rejected:"مرفوض"};
  const ago=(date:string)=>{const days=Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/86400000));return days===0?"اليوم":days===1?"منذ يوم":`منذ ${new Intl.NumberFormat("ar-SA").format(days)} أيام`};
  const visibleReviews=filter==="all"?reviews:reviews.filter(review=>review.status===filter);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold">الأسئلة والتقييمات ({reviews.length})</h2><p className="mt-1 text-xs text-muted-foreground">كل تقييم جديد من العميلات يظهر هنا تلقائياً</p></div><Select value={filter} onValueChange={setFilter}><SelectTrigger className="h-9 w-40"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">كل التقييمات</SelectItem><SelectItem value="pending">بانتظار المراجعة</SelectItem><SelectItem value="approved">المنشورة</SelectItem><SelectItem value="rejected">المرفوضة</SelectItem></SelectContent></Select></div>
    {reviews.length===0&&<Empty text="لا توجد تقييمات حتى الآن"/>}
    {reviews.length>0&&visibleReviews.length===0&&<Empty text="لا توجد تقييمات بهذه الحالة"/>}
    {visibleReviews.map(r=>{const product=products.find(p=>p.id===r.product_id);const image=product?.product_images?.[0]?.image_url;return <article key={r.id} className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 text-xs text-muted-foreground"><span>{ago(r.created_at)}</span><span className="rounded-full bg-muted px-3 py-1">{statusLabel[r.status]??r.status}</span></div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3">{image?<img src={image} alt="" className="size-11 rounded-full border object-cover"/>:<span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary">{r.products?.name_ar?.slice(0,1)??"L"}</span>}<div className="min-w-0"><p className="truncate text-sm font-bold text-primary">{r.products?.name_ar??"منتج LASHES ½"}</p><p className="mt-1 text-xs text-muted-foreground">تقييم منتج</p></div></div><Button size="icon" variant="outline" className="size-9 border-destructive/40 text-destructive" aria-label="حذف التقييم" onClick={()=>onDelete(r.id)}><Trash2 className="size-4"/></Button></div>
        <div className="mt-5 flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted font-bold">{r.customer_name.slice(0,1)}</span><div><b className="text-sm">{r.customer_name}</b><p className="mt-1 text-amber-400" aria-label={`${r.rating} من 5`}>{"★".repeat(r.rating)}<span className="text-muted">{"★".repeat(Math.max(0,5-r.rating))}</span></p><p className="mt-3 text-sm leading-7">{r.body}</p>{r.admin_reply&&<div className="mt-3 rounded-md bg-muted/60 p-3 text-sm"><b>رد المتجر:</b> {r.admin_reply}</div>}</div></div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4"><Select value={r.status} onValueChange={value=>void onStatus(r.id,value)}><SelectTrigger className="h-9 w-32 border-primary/40 text-primary"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="approved">منشور</SelectItem><SelectItem value="pending">بانتظار</SelectItem><SelectItem value="rejected">مرفوض</SelectItem></SelectContent></Select><Button size="sm" variant="outline" onClick={async()=>{const reply=prompt("اكتبي رد الإدارة",r.admin_reply??"");if(reply!==null){await supabase.from("reviews").update({admin_reply:reply}).eq("id",r.id);location.reload()}}}>رد على التقييم</Button></div>
      </div>
    </article>})}
  </div>;
}
function Marketing(){return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[{t:"البنرات الترويجية",v:"إدارة عروض الواجهة",i:Megaphone},{t:"العروض",v:"عروض المنتجات الحالية",i:Gift},{t:"السلات المتروكة",v:"استعادة المبيعات",i:ShoppingBag},{t:"حملات العملاء",v:"رسائل وحملات موجهة",i:Users}].map(x=><div key={x.t} className="rounded-lg border bg-card p-6"><x.i className="mb-8 text-primary"/><h3 className="font-bold">{x.t}</h3><p className="mt-1 text-sm text-muted-foreground">{x.v}</p><Button variant="outline" className="mt-5 w-full">إدارة</Button></div>)}</div>}
function Empty({text}:{text:string}){return <div className="rounded-lg border border-dashed bg-card p-14 text-center text-muted-foreground">{text}</div>}

function ProductDialog({open,editing,categories,onOpenChange,onSaved}:{open:boolean;editing:Product|null;categories:Category[];onOpenChange:(v:boolean)=>void;onSaved:()=>Promise<void>}) { const [form,setForm]=useState({name_ar:"",slug:"",description_ar:"",regular_price:"",sale_price:"",stock:"0",sku:"",is_active:true,image_url:"",category_id:""}); useEffect(()=>{setForm(editing?{name_ar:editing.name_ar,slug:editing.slug,description_ar:editing.description_ar,regular_price:String(editing.regular_price),sale_price:editing.sale_price?String(editing.sale_price):"",stock:String(editing.stock),sku:editing.sku,is_active:editing.is_active,image_url:editing.product_images?.[0]?.image_url??"",category_id:editing.category_id??""}:{name_ar:"",slug:"",description_ar:"",regular_price:"",sale_price:"",stock:"0",sku:"",is_active:true,image_url:"",category_id:""})},[editing,open]); const save=async()=>{const payload={name_ar:form.name_ar,slug:form.slug,description_ar:form.description_ar,regular_price:Number(form.regular_price),sale_price:form.sale_price?Number(form.sale_price):null,stock:Number(form.stock),sku:form.sku,is_active:form.is_active,category_id:form.category_id||null}; let id=editing?.id; if(id){await supabase.from("products").update(payload).eq("id",id)}else{const {data}=await supabase.from("products").insert(payload).select("id").single(); id=data?.id} if(id&&form.image_url){await supabase.from("product_images").delete().eq("product_id",id);await supabase.from("product_images").insert({product_id:id,image_url:form.image_url,alt_text:form.name_ar})}onOpenChange(false);await onSaved()}; const field=(key:keyof typeof form,label:string,type="text")=><label className="space-y-1 text-sm"><span>{label}</span><Input type={type} value={String(form[key])} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>; return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"تعديل المنتج":"إضافة منتج"}</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2">{field("name_ar","اسم المنتج")}<label className="space-y-1 text-sm"><span>التصنيف</span><Select value={form.category_id} onValueChange={v=>setForm({...form,category_id:v})}><SelectTrigger><SelectValue placeholder="اختاري التصنيف"/></SelectTrigger><SelectContent>{categories.map(c=><SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}</SelectContent></Select></label>{field("slug","الرابط المختصر")}{field("sku","رمز المنتج SKU")}{field("stock","المخزون","number")}{field("regular_price","السعر الأساسي","number")}{field("sale_price","سعر التخفيض","number")}{field("image_url","رابط صورة المنتج")}<label className="space-y-1 text-sm"><span>رفع صورة</span><Input type="file" accept="image/*" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;const path=`${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;const {error}=await supabase.storage.from("product-images").upload(path,file);if(!error)setForm({...form,image_url:`storage:${path}`})}}/><small className="text-muted-foreground">PNG أو JPG حتى ٨ ميجابايت</small></label><label className="flex items-center justify-between rounded-md border p-3">نشط<Switch checked={form.is_active} onCheckedChange={v=>setForm({...form,is_active:v})}/></label><label className="space-y-1 sm:col-span-2"><span>الوصف</span><Textarea value={form.description_ar} onChange={e=>setForm({...form,description_ar:e.target.value})}/></label></div><Button onClick={()=>void save()} disabled={!form.name_ar||!form.slug||!form.sku||!form.regular_price}>حفظ المنتج</Button></DialogContent></Dialog> }
function CouponDialog({open,onOpenChange,onSaved}:{open:boolean;onOpenChange:(v:boolean)=>void;onSaved:()=>Promise<void>}) { const [f,setF]=useState({code:"",type:"percentage",value:"",minimum:"0",limit:""}); const save=async()=>{await supabase.from("coupons").insert({code:f.code.toUpperCase(),discount_type:f.type as never,discount_value:Number(f.value),minimum_order:Number(f.minimum),usage_limit:f.limit?Number(f.limit):null});onOpenChange(false);await onSaved()}; return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent dir="rtl"><DialogHeader><DialogTitle>كوبون جديد</DialogTitle></DialogHeader><Input placeholder="كود الخصم" value={f.code} onChange={e=>setF({...f,code:e.target.value})}/><Select value={f.type} onValueChange={v=>setF({...f,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="percentage">نسبة مئوية</SelectItem><SelectItem value="fixed">مبلغ ثابت</SelectItem></SelectContent></Select><Input type="number" placeholder="قيمة الخصم" value={f.value} onChange={e=>setF({...f,value:e.target.value})}/><Input type="number" placeholder="الحد الأدنى للطلب" value={f.minimum} onChange={e=>setF({...f,minimum:e.target.value})}/><Input type="number" placeholder="حد الاستخدام" value={f.limit} onChange={e=>setF({...f,limit:e.target.value})}/><Button onClick={()=>void save()} disabled={!f.code||!f.value}>إنشاء الكوبون</Button></DialogContent></Dialog> }
function PaymentSettings(){const [rows,setRows]=useState<{id:string;name_ar:string;code:string;is_active:boolean}[]>([]);useEffect(()=>{void supabase.from("payment_methods").select("id,name_ar,code,is_active").order("sort_order").then(({data})=>setRows(data??[]))},[]);return <div className="grid gap-3">{rows.map(p=><div key={p.id} className="flex items-center justify-between rounded-lg border bg-card p-5"><div><b>{p.name_ar}</b><p className="text-xs text-muted-foreground">{p.code}</p></div><Switch checked={p.is_active} onCheckedChange={async v=>{await supabase.from("payment_methods").update({is_active:v}).eq("id",p.id);setRows(rows.map(x=>x.id===p.id?{...x,is_active:v}:x))}}/></div>)}</div>}
function ShippingSettings(){const [rows,setRows]=useState<{id:string;name_ar:string;company:string|null;price:number;free_shipping_threshold:number|null;estimated_days_min:number;estimated_days_max:number;is_active:boolean}[]>([]);const [open,setOpen]=useState(false);const [editing,setEditing]=useState<(typeof rows)[number]|null>(null);const load=async()=>{const {data}=await supabase.from("shipping_methods").select("*").order("created_at");setRows(data??[])};useEffect(()=>{void load()},[]);return <div><div className="mb-4 flex justify-end"><Button onClick={()=>{setEditing(null);setOpen(true)}}><Plus/>إضافة طريقة شحن</Button></div><div className="grid gap-4">{rows.map(r=><div key={r.id} className="rounded-lg border bg-card p-6"><div className="flex items-center justify-between gap-3"><div><b>{r.name_ar}</b><p className="text-sm text-muted-foreground">{r.company??""} · {sar(Number(r.price))} · {r.estimated_days_min}-{r.estimated_days_max} أيام</p></div><div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={()=>{setEditing(r);setOpen(true)}}>تعديل</Button><Switch checked={r.is_active} onCheckedChange={async v=>{await supabase.from("shipping_methods").update({is_active:v}).eq("id",r.id);await load()}}/></div></div></div>)}</div><ShippingDialog open={open} editing={editing} onOpenChange={setOpen} onSaved={load}/></div>}
function ShippingDialog({open,editing,onOpenChange,onSaved}:{open:boolean;editing:{id:string;name_ar:string;company:string|null;price:number;free_shipping_threshold:number|null;estimated_days_min:number;estimated_days_max:number;is_active:boolean}|null;onOpenChange:(v:boolean)=>void;onSaved:()=>Promise<void>}){const [f,setF]=useState({name_ar:"",company:"",price:"0",free:"",min:"2",max:"5"});useEffect(()=>setF(editing?{name_ar:editing.name_ar,company:editing.company??"",price:String(editing.price),free:String(editing.free_shipping_threshold??""),min:String(editing.estimated_days_min),max:String(editing.estimated_days_max)}:{name_ar:"",company:"",price:"0",free:"",min:"2",max:"5"}),[editing,open]);const save=async()=>{const payload={name_ar:f.name_ar,company:f.company||null,price:Number(f.price),free_shipping_threshold:f.free?Number(f.free):null,estimated_days_min:Number(f.min),estimated_days_max:Number(f.max)};if(editing)await supabase.from("shipping_methods").update(payload).eq("id",editing.id);else await supabase.from("shipping_methods").insert(payload);onOpenChange(false);await onSaved()};const fields:Array<[keyof typeof f,string]>=[["name_ar","الاسم"],["company","الشركة"],["price","السعر"],["free","حد الشحن المجاني"],["min","أقل مدة بالأيام"],["max","أقصى مدة بالأيام"]];return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{editing?"تعديل طريقة الشحن":"إضافة طريقة شحن"}</DialogTitle></DialogHeader>{fields.map(([key,label])=><label key={key} className="space-y-1 text-sm"><span>{label}</span><Input type={["price","free","min","max"].includes(key)?"number":"text"} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})}/></label>)}<Button onClick={()=>void save()} disabled={!f.name_ar}>حفظ</Button></DialogContent></Dialog>}
function StoreSettings(){const [f,setF]=useState({store_name:"LASHES 1/2",whatsapp:"",email:"",phone:"",vat_rate:"15",currency:"SAR"});const [saved,setSaved]=useState(false);useEffect(()=>{void supabase.from("store_settings").select("store_name,whatsapp,email,phone,vat_rate,currency").single().then(({data})=>{if(data)setF({store_name:data.store_name,whatsapp:data.whatsapp??"",email:data.email??"",phone:data.phone??"",vat_rate:String(data.vat_rate),currency:data.currency})})},[]);const save=async()=>{await supabase.from("store_settings").update({...f,vat_rate:Number(f.vat_rate)}).eq("id",true);setSaved(true)};return <section className="max-w-3xl rounded-lg border bg-card p-6"><div className="grid gap-4 sm:grid-cols-2">{Object.entries(f).map(([k,v])=><label key={k} className="space-y-1 text-sm"><span>{{store_name:"اسم المتجر",whatsapp:"واتساب",email:"البريد",phone:"الهاتف",vat_rate:"ضريبة القيمة المضافة",currency:"العملة"}[k]}</span><Input value={v} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}</div><Button className="mt-6" onClick={()=>void save()}>{saved?"تم الحفظ":"حفظ الإعدادات"}</Button></section>}