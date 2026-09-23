import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarDays, Check, ChevronDown, CreditCard, Filter, Gamepad2, Grid2X2, ImagePlus, Layers3, List, Loader2, Package, Pin, Plus, Repeat2, ScanLine, Search, Shirt, SlidersHorizontal, Trash2, Utensils, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Json } from "@/integrations/supabase/types";
import type { Product } from "@/lib/store";

type Category = { id: string; name_ar: string; is_active: boolean };
type Props = {
  products: Product[];
  categories: Category[];
  search: string;
  setSearch: (value: string) => void;
  onDelete: (id: string) => void;
  onSaved: () => Promise<void>;
};

type Draft = {
  name_ar: string;
  name_en: string;
  slug: string;
  description_ar: string;
  description_en: string;
  regular_price: string;
  sale_price: string;
  stock: string;
  low_stock_threshold: string;
  sku: string;
  category_id: string;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  specifications: string;
};

const makeDraft = (product: Product): Draft => ({
  name_ar: product.name_ar,
  name_en: product.name_en ?? "",
  slug: product.slug,
  description_ar: product.description_ar,
  description_en: product.description_en ?? "",
  regular_price: String(product.regular_price),
  sale_price: product.sale_price == null ? "" : String(product.sale_price),
  stock: String(product.stock),
  low_stock_threshold: String(product.low_stock_threshold),
  sku: product.sku,
  category_id: product.category_id ?? "none",
  images: (product.product_images ?? []).map((image) => image.image_url).filter(Boolean),
  is_active: product.is_active,
  is_featured: product.is_featured,
  is_bestseller: product.is_bestseller,
  specifications: JSON.stringify(product.specifications ?? {}, null, 2),
});

export function ProductsPage({ products, categories, search, setSearch, onDelete, onSaved }: Props) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const list = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.name_ar} ${product.name_en ?? ""} ${product.sku}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (filter === "all" || (filter === "active" ? product.is_active : !product.is_active));
  }), [products, search, filter]);

  const openAdd = (type: string) => { setAddType(type); setShowAdd(true); };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <DropdownMenu open={addOpen} onOpenChange={setAddOpen} dir="rtl">
        <DropdownMenuTrigger asChild><Button className="h-10 rounded-full px-5"><Plus className="size-5" />إضافة منتج جديد<ChevronDown className={`size-4 transition-transform ${addOpen ? "rotate-180" : ""}`} /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="w-[290px] p-0 shadow-lg">
          <AddProductOption icon={Package} title="منتج جاهز" description="منتجات ملموسة وقابلة للشحن" onSelect={() => openAdd("منتج جاهز")}/>
          <AddProductOption icon={Shirt} title="خدمة حسب الطلب" description="كالتصميم والطباعة والبحوث والكتابة" onSelect={() => openAdd("خدمة حسب الطلب")}/>
          <AddProductOption icon={Utensils} title="أكل" description="مأكولات ومشروبات تتطلب شحناً خاصاً" onSelect={() => openAdd("أكل")}/>
          <AddProductOption icon={Gamepad2} title="منتج رقمي" description="كتب وملفات إلكترونية ودورات مسجلة" onSelect={() => openAdd("منتج رقمي")}/>
          <AddProductOption icon={CreditCard} title="بطاقة رقمية" description="بطاقات شحن أو حسابات للبيع" onSelect={() => openAdd("بطاقة رقمية")}/>
          <AddProductOption icon={Layers3} title="مجموعة منتجات" description="أكثر من منتج في منتج واحد" onSelect={() => openAdd("مجموعة منتجات")}/>
          <AddProductOption icon={CalendarDays} title="حجوزات" description="دورات واستشارات وخدمات طبية وسياحية" onSelect={() => openAdd("حجوزات")}/>
          <DropdownMenuSeparator className="m-0"/>
          <DropdownMenuItem onSelect={() => { setAddType("منتج جاهز"); setShowAdd(true); }} className="gap-3 rounded-none bg-muted/60 px-4 py-3 focus:bg-muted">
            <ScanLine className="size-5 text-muted-foreground"/>
            <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-medium">استخدام نماذج جاهزة! <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] text-destructive-foreground">جديد</span></p><p className="mt-0.5 text-xs text-muted-foreground">إضافة منتج بسرعة وسهولة</p></div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p>الرئيسية <span className="mx-2">/</span> <span className="text-foreground">المنتجات</span></p>
    </div>
    <AddProductDialog
      type={addType}
      open={showAdd}
      onOpenChange={(open) => { setShowAdd(open); if (!open) setAddType(null); }}
      categories={categories}
      onSaved={onSaved}
    />
    <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1 sm:max-w-sm"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 pr-9" placeholder="ابحث باسم المنتج، التصنيف، وصف المنتج أو SKU" /></div>
      <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-32 border-0 shadow-none"><Filter className="size-4"/><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">تصفية</SelectItem><SelectItem value="active">المنتجات النشطة</SelectItem><SelectItem value="inactive">غير النشطة</SelectItem></SelectContent></Select>
      <Button variant="ghost" className="gap-2"><BriefcaseBusiness className="size-4"/>خدمات</Button>
      <div className="sm:mr-auto flex rounded-md border bg-background p-1"><Button size="icon" variant={view === "grid" ? "secondary" : "ghost"} className="size-9" onClick={() => setView("grid")} aria-label="عرض شبكي"><Grid2X2 className="size-4"/></Button><Button size="icon" variant={view === "list" ? "secondary" : "ghost"} className="size-9" onClick={() => setView("list")} aria-label="عرض قائمة"><List className="size-4"/></Button></div>
    </div>
    {!list.length && <div className="grid min-h-64 place-items-center rounded-md border border-dashed bg-card text-sm text-muted-foreground">لا توجد منتجات مطابقة.</div>}
    <div className={view === "grid" ? "grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3" : "grid gap-4"}>
      {list.map((product) => <ProductEditor key={product.id} product={product} categories={categories} compact={view === "list"} onDelete={onDelete} onSaved={onSaved} />)}
    </div>
  </div>;
}

function AddProductOption({ icon: Icon, title, description, onSelect }: { icon: typeof Package; title: string; description: string; onSelect: () => void }) {
  return <DropdownMenuItem onSelect={onSelect} className="gap-3 rounded-none px-4 py-2.5 focus:bg-muted/60">
    <Icon className="size-5 shrink-0 text-muted-foreground"/>
    <div className="min-w-0"><p className="font-medium text-foreground">{title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p></div>
  </DropdownMenuItem>;
}

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^\w\u0600-\u06FF-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

function AddProductDialog({ type, open, onOpenChange, categories, onSaved }: { type: string | null; open: boolean; onOpenChange: (value: boolean) => void; categories: Category[]; onSaved: () => Promise<void> }) {
  const emptyForm = { name_ar: "", name_en: "", slug: "", sku: "", regular_price: "", sale_price: "", stock: "0", category_id: "none", description_ar: "", is_active: true };
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setForm(emptyForm); setImages([]); setError(""); setSaving(false); } }, [open]);
  useEffect(() => {
    let active = true;
    void Promise.all(images.map(async (image) => {
      if (!image.startsWith("storage:")) return image;
      const { data } = await supabase.storage.from("product-images").createSignedUrl(image.slice(8), 3600);
      return data?.signedUrl ?? "";
    })).then((urls) => { if (active) setPreviews(urls); });
    return () => { active = false; };
  }, [images]);
  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm((current) => ({ ...current, [key]: value }));
  const upload = async (files?: FileList | null) => {
    if (!files?.length) return;
    const added: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file);
      if (uploadError) { setError("تعذّر رفع الصورة."); continue; }
      added.push(`storage:${path}`);
    }
    if (added.length) setImages((current) => [...current, ...added]);
  };
  const save = async () => {
    setError("");
    if (!form.name_ar.trim() || !form.regular_price) { setError("أكملي اسم المنتج والسعر على الأقل."); return; }
    const slug = form.slug.trim() || slugify(form.name_en || form.name_ar) || `product-${Date.now()}`;
    const sku = form.sku.trim() || `LH-${Date.now().toString().slice(-8)}`;
    setSaving(true);
    const { data, error: insertError } = await supabase.from("products").insert({
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim() || null,
      slug,
      description_ar: form.description_ar,
      regular_price: Number(form.regular_price),
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      stock: Number(form.stock) || 0,
      sku,
      category_id: form.category_id === "none" ? null : form.category_id,
      is_active: form.is_active,
      specifications: { product_type: type ?? "منتج جاهز" },
    }).select("id").single();
    if (insertError || !data) { setSaving(false); setError("تعذّر إضافة المنتج. حاولي مرة أخرى."); return; }
    if (images.length) await supabase.from("product_images").insert(images.map((image, index) => ({ product_id: data.id, image_url: image, alt_text: form.name_ar.trim(), sort_order: index })));
    setSaving(false);
    onOpenChange(false);
    await onSaved();
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent dir="rtl" className="max-h-[90vh] max-w-lg overflow-y-auto">
      <DialogHeader><DialogTitle className="text-base">إضافة منتج جديد{type ? ` — ${type}` : ""}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs"><span>اسم المنتج *</span><Input value={form.name_ar} onChange={(event) => set("name_ar", event.target.value)} placeholder="مثال: مسكرة الرموش"/></label>
          <label className="space-y-1 text-xs"><span>الاسم بالإنجليزية</span><Input dir="ltr" value={form.name_en} onChange={(event) => set("name_en", event.target.value)} placeholder="Product name"/></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs"><span>السعر (ر.س) *</span><Input dir="ltr" type="number" value={form.regular_price} onChange={(event) => set("regular_price", event.target.value)} placeholder="149"/></label>
          <label className="space-y-1 text-xs"><span>سعر التخفيض</span><Input dir="ltr" type="number" value={form.sale_price} onChange={(event) => set("sale_price", event.target.value)} placeholder="99"/></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs"><span>الكمية بالمخزون</span><Input dir="ltr" type="number" value={form.stock} onChange={(event) => set("stock", event.target.value)} /></label>
          <label className="space-y-1 text-xs"><span>التصنيف</span><Select value={form.category_id} onValueChange={(value) => set("category_id", value)}><SelectTrigger><SelectValue placeholder="اختر التصنيف"/></SelectTrigger><SelectContent><SelectItem value="none">بدون تصنيف</SelectItem>{categories.filter((category) => category.is_active).map((category) => <SelectItem key={category.id} value={category.id}>{category.name_ar}</SelectItem>)}</SelectContent></Select></label>
        </div>
        <label className="space-y-1 text-xs"><span>وصف المنتج</span><Textarea value={form.description_ar} onChange={(event) => set("description_ar", event.target.value)} placeholder="وصف مختصر يظهر في صفحة المنتج"/></label>
        <div>
          <p className="mb-1.5 text-xs font-medium">صور المنتج</p>
          <label
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); void upload(event.dataTransfer.files); }}
            className="grid cursor-pointer place-items-center rounded-md border border-dashed bg-muted/40 px-4 py-5 text-center text-xs"
          >
            <span className="font-medium">اسحب الصور هنا أو تصفحي من جهازك</span>
            <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => void upload(event.target.files)}/>
          </label>
          {images.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{images.map((image, index) => <div key={`${image}-${index}`} className="relative size-16 overflow-hidden rounded-md border bg-muted">{previews[index] ? <img src={previews[index]} alt="" className="size-full object-cover"/> : <div className="grid size-full place-items-center text-muted-foreground"><Package className="size-5"/></div>}<button type="button" aria-label="إزالة" onClick={() => setImages((current) => current.filter((_, position) => position !== index))} className="absolute left-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-background shadow"><X className="size-3"/></button></div>)}</div>}
        </div>
        <label className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">المنتج متاح للبيع<Switch checked={form.is_active} onCheckedChange={(value) => set("is_active", value)}/></label>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <Button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin"/> : <Plus className="size-4"/>}إضافة المنتج</Button>
      </div>
    </DialogContent>
  </Dialog>;
}

function ProductEditor({ product, categories, compact, onDelete, onSaved }: { product: Product; categories: Category[]; compact: boolean; onDelete: (id: string) => void; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState(() => makeDraft(product));
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => { setDraft(makeDraft(product)); }, [product]);
  useEffect(() => {
    let active = true;
    void Promise.all(draft.images.map(async (image) => {
      if (!image.startsWith("storage:")) return image;
      const { data } = await supabase.storage.from("product-images").createSignedUrl(image.slice(8), 3600);
      return data?.signedUrl ?? "";
    })).then((urls) => { if (active) setPreviews(urls); });
    return () => { active = false; };
  }, [draft.images]);
  const preview = previews[0] ?? "";
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const upload = async (files?: FileList | null) => {
    if (!files?.length) return;
    const added: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file);
      if (uploadError) { setError("تعذّر رفع الصورة."); continue; }
      added.push(`storage:${path}`);
    }
    if (added.length) setDraft((current) => ({ ...current, images: [...current.images, ...added] }));
  };
  const save = async () => {
    setError(""); setSaved(false);
    if (!draft.name_ar.trim() || !draft.slug.trim() || !draft.sku.trim() || !draft.regular_price) { setError("أكملي اسم المنتج والرابط والرمز والسعر."); return; }
    let specifications: Json = {};
    try { specifications = draft.specifications.trim() ? JSON.parse(draft.specifications) as Json : {}; } catch { setError("صيغة المواصفات غير صحيحة."); return; }
    setSaving(true);
    const payload = { name_ar: draft.name_ar.trim(), name_en: draft.name_en.trim() || null, slug: draft.slug.trim(), description_ar: draft.description_ar, description_en: draft.description_en.trim() || null, regular_price: Number(draft.regular_price), sale_price: draft.sale_price ? Number(draft.sale_price) : null, stock: Number(draft.stock), low_stock_threshold: Number(draft.low_stock_threshold), sku: draft.sku.trim(), category_id: draft.category_id === "none" ? null : draft.category_id, is_active: draft.is_active, is_featured: draft.is_featured, is_bestseller: draft.is_bestseller, specifications };
    const { error: productError } = await supabase.from("products").update(payload).eq("id", product.id);
    const original = (product.product_images ?? []).map((image) => image.image_url).join("|");
    if (!productError && draft.images.join("|") !== original) {
      await supabase.from("product_images").delete().eq("product_id", product.id);
      if (draft.images.length) await supabase.from("product_images").insert(draft.images.map((image, index) => ({ product_id: product.id, image_url: image, alt_text: draft.name_ar, sort_order: index })));
    }
    setSaving(false);
    if (productError) { setError("تعذّر حفظ المنتج. حاولي مرة أخرى."); return; }
    setSaved(true); await onSaved(); window.setTimeout(() => setSaved(false), 1800);
  };

  return <article className={`overflow-hidden rounded-md border bg-card shadow-sm ${compact ? "md:grid md:grid-cols-[240px_1fr]" : ""}`}>
    <div className={`group relative bg-muted ${compact ? "min-h-56" : "aspect-[1.35]"}`}>
      {preview ? <img src={preview} alt={draft.name_ar} className="size-full object-cover"/> : <div className="grid size-full min-h-56 place-items-center text-muted-foreground"><Package className="size-12"/></div>}
      <button type="button" onClick={() => setMediaOpen(true)} className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium shadow-sm"><ImagePlus className="size-4"/>إضافة صورة أو فيديو</button>
      {draft.images.length > 1 && <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-2 py-1 text-[11px] shadow-sm">{draft.images.length} وسائط</span>}
      <Button type="button" size="icon" variant="outline" className="absolute left-3 top-3 size-9" onClick={() => set("is_featured", !draft.is_featured)} title="تثبيت المنتج"><Pin className={`size-4 ${draft.is_featured ? "fill-current text-primary" : ""}`}/></Button>
    </div>
    <div className="p-3">
      <FieldIcon icon={<Package className="size-4"/>}><Input value={draft.name_ar} onChange={(event) => set("name_ar", event.target.value)} aria-label="اسم المنتج"/></FieldIcon>
      <div className="mt-3 grid grid-cols-2 gap-2"><FieldIcon suffix="ر.س"><Input dir="ltr" type="number" value={draft.regular_price} onChange={(event) => set("regular_price", event.target.value)} aria-label="السعر"/></FieldIcon><FieldIcon icon={<Package className="size-4"/>}><Input dir="ltr" type="number" value={draft.stock} onChange={(event) => set("stock", event.target.value)} aria-label="الكمية"/></FieldIcon></div>
      <div className="mt-3"><Select value={draft.category_id} onValueChange={(value) => set("category_id", value)}><SelectTrigger><SelectValue placeholder="اختر تصنيف المنتج"/></SelectTrigger><SelectContent><SelectItem value="none">بدون تصنيف</SelectItem>{categories.filter((category) => category.is_active).map((category) => <SelectItem key={category.id} value={category.id}>{category.name_ar}</SelectItem>)}</SelectContent></Select></div>
      <label className="mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-xs">المنتج متاح للبيع<Switch checked={draft.is_active} onCheckedChange={(value) => set("is_active", value)}/></label>
      {more && <div className="mt-3 grid gap-3 border-t pt-3">
        <Input value={draft.name_en} onChange={(event) => set("name_en", event.target.value)} placeholder="اسم المنتج بالإنجليزية"/>
        <div className="grid grid-cols-2 gap-2"><Input value={draft.slug} onChange={(event) => set("slug", event.target.value)} placeholder="الرابط المختصر"/><Input value={draft.sku} onChange={(event) => set("sku", event.target.value)} placeholder="SKU"/></div>
        <div className="grid grid-cols-2 gap-2"><Input dir="ltr" type="number" value={draft.sale_price} onChange={(event) => set("sale_price", event.target.value)} placeholder="سعر التخفيض"/><Input dir="ltr" type="number" value={draft.low_stock_threshold} onChange={(event) => set("low_stock_threshold", event.target.value)} placeholder="حد المخزون"/></div>
        <Textarea value={draft.description_ar} onChange={(event) => set("description_ar", event.target.value)} placeholder="الوصف بالعربية"/>
        <Textarea value={draft.description_en} onChange={(event) => set("description_en", event.target.value)} placeholder="الوصف بالإنجليزية"/>
        <Textarea dir="ltr" value={draft.specifications} onChange={(event) => set("specifications", event.target.value)} placeholder="المواصفات JSON" className="font-mono text-xs"/>
        <div className="grid grid-cols-2 gap-2"><label className="flex items-center justify-between rounded-md border p-2 text-xs">مميز<Switch checked={draft.is_featured} onCheckedChange={(value) => set("is_featured", value)}/></label><label className="flex items-center justify-between rounded-md border p-2 text-xs">الأكثر مبيعاً<Switch checked={draft.is_bestseller} onCheckedChange={(value) => set("is_bestseller", value)}/></label></div>
        <Button type="button" variant="outline" onClick={() => setMediaOpen(true)}><ImagePlus className="size-4"/>إدارة صور وفيديوهات المنتج</Button>
      </div>}
      <div className="mt-3 grid grid-cols-2 border-y"><Button type="button" variant="ghost" className="rounded-none border-l" onClick={() => setMore((value) => !value)}><SlidersHorizontal className="size-4"/>بيانات المنتج</Button><Button type="button" variant="ghost" className="rounded-none" onClick={() => setMore((value) => !value)}>المزيد<ChevronDown className={`size-4 transition ${more ? "rotate-180" : ""}`}/></Button></div>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-3 flex gap-2"><Button className="flex-1" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin"/> : saved ? <Check className="size-4"/> : null}{saved ? "تم الحفظ" : "حفظ"}</Button><Button size="icon" variant="ghost" aria-label="حذف المنتج" onClick={() => onDelete(product.id)}><Trash2 className="size-4"/></Button></div>
    </div>
    <MediaDialog
      open={mediaOpen}
      onOpenChange={setMediaOpen}
      images={draft.images}
      previews={previews}
      onUpload={(files) => void upload(files)}
      onAddUrl={(url) => setDraft((current) => ({ ...current, images: [...current.images, url] }))}
      onRemove={(index) => setDraft((current) => ({ ...current, images: current.images.filter((_, position) => position !== index) }))}
      onPrimary={(index) => setDraft((current) => ({ ...current, images: [current.images[index] as string, ...current.images.filter((_, position) => position !== index)] }))}
    />
  </article>;
}

function MediaDialog({ open, onOpenChange, images, previews, onUpload, onAddUrl, onRemove, onPrimary }: { open: boolean; onOpenChange: (value: boolean) => void; images: string[]; previews: string[]; onUpload: (files: FileList | null) => void; onAddUrl: (url: string) => void; onRemove: (index: number) => void; onPrimary: (index: number) => void }) {
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const addUrl = () => { const value = url.trim(); if (!value) return; onAddUrl(value); setUrl(""); };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent dir="rtl" className="max-w-2xl gap-0 overflow-hidden p-0">
      <DialogHeader className="bg-primary/15 px-5 py-4 text-right"><DialogTitle className="text-base">صور وفيديوهات المنتج</DialogTitle></DialogHeader>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
        <div>
          <p className="text-sm font-medium">صور المنتج</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">المقاس لا يقل عن (100px ارتفاع * 250px عرض) من نوع ( jpg، jpeg، png، gif ) ولا يتجاوز 5 ميجابايت لكل صورة بحد أقصى 10 صور</p>
        </div>
        <label
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); onUpload(event.dataTransfer.files); }}
          className={`grid cursor-pointer place-items-center rounded-md border border-dashed px-4 py-7 text-center text-sm ${dragging ? "border-primary bg-primary/10" : "bg-muted/40"}`}
        >
          <span className="font-medium">اسحب الصورة وأفلتها هنا</span>
          <span className="mt-1 text-xs text-muted-foreground">أو تصفح من جهازك</span>
          <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => onUpload(event.target.files)}/>
        </label>
        <div className="flex items-stretch gap-2">
          <div className="relative flex-1"><Input value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addUrl(); } }} placeholder="أضف رابط صورة أو فيديو من اليوتيوب"/></div>
          <Button type="button" variant="secondary" onClick={addUrl}><Plus className="size-4"/>إضافة</Button>
        </div>
        {images.length > 0 && <div className="grid gap-4 sm:grid-cols-2">
          {images.map((image, index) => <div key={`${image}-${index}`} className="overflow-hidden rounded-md border">
            <div className="relative aspect-[1.05] bg-muted">
              {previews[index] ? <img src={previews[index]} alt="" className="size-full object-cover"/> : <div className="grid size-full place-items-center text-muted-foreground"><Package className="size-10"/></div>}
              <Button type="button" size="icon" variant="secondary" className="absolute left-2 top-2 size-8 rounded-full" aria-label="إزالة الصورة" onClick={() => onRemove(index)}><X className="size-4"/></Button>
            </div>
            <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
              <div className="flex gap-1"><Button type="button" size="icon" variant="ghost" className="size-8 text-destructive" aria-label="حذف" onClick={() => onRemove(index)}><Trash2 className="size-4"/></Button><Button type="button" size="icon" variant="ghost" className="size-8" aria-label="تعيين كصورة أساسية" onClick={() => onPrimary(index)}><Repeat2 className="size-4"/></Button></div>
              <label className="flex items-center gap-2 text-xs">الصورة الأساسية<Switch checked={index === 0} onCheckedChange={() => onPrimary(index)}/></label>
            </div>
          </div>)}
        </div>}
      </div>
      <div className="border-t px-5 py-3"><Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>إغلق</Button></div>
    </DialogContent>
  </Dialog>;
}

function FieldIcon({ children, icon, suffix }: { children: React.ReactNode; icon?: React.ReactNode; suffix?: string }) {
  return <div className="relative">{icon && <span className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">{icon}</span>}<div className={icon ? "[&_input]:pr-9" : suffix ? "[&_input]:pl-12" : ""}>{children}</div>{suffix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}</div>;
}