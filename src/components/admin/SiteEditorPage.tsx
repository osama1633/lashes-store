import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Monitor, RotateCcw, Save, Smartphone, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { fetchProducts, type Product } from "@/lib/store";
import { editableFields, initialOrder, normalizeSiteContent, sectionNames, type SiteContent } from "@/lib/site-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function SiteEditorPage() {
  const [draft, setDraft] = useState<SiteContent>({ order: initialOrder, fields: {}, hidden: [] });
  const [selected, setSelected] = useState("home");
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Record<string, { regular_price: string; sale_price: string }>>({});
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      supabase.from("storefront_drafts").select("content").eq("id", true).maybeSingle(),
      fetchProducts(),
    ]).then(([record, list]) => {
      if (!alive) return;
      if (record.error) setStatus("تعذر تحميل المسودة. تأكد من صلاحية المدير.");
      else setDraft(normalizeSiteContent(record.data?.content));
      setProducts(list);
      const savedPrices = normalizeSiteContent(record.data?.content).prices ?? {};
      setPrices(Object.fromEntries(list.map(p => [p.id, savedPrices[p.id] ?? { regular_price: String(p.regular_price), sale_price: p.sale_price == null ? "" : String(p.sale_price) }])));
    }).catch(() => setStatus("تعذر تحميل بيانات المحرّر."));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const paths = Object.entries(draft.fields ?? {}).filter(([key, value]) => value.startsWith("storage:") && !thumbs[key]);
    if (!paths.length) return;
    void Promise.all(paths.map(async ([key, value]) => {
      const { data } = await supabase.storage.from("product-images").createSignedUrl(value.slice(8), 3600);
      return [key, data?.signedUrl] as const;
    })).then(rows => { if (alive) setThumbs(old => ({ ...old, ...Object.fromEntries(rows.filter((row): row is readonly [string, string] => Boolean(row[1]))) })); });
    return () => { alive = false; };
  }, [draft.fields, thumbs]);

  useEffect(() => {
    const send = () => frame.current?.contentWindow?.postMessage({ type: "lashes-preview", content: { ...draft, prices } }, window.location.origin);
    send();
    const onLoad = () => send();
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "lashes-ready") send();
      if (event.data?.type === "lashes-select" && typeof event.data.section === "string" && event.data.section in sectionNames) setSelected(event.data.section);
    };
    frame.current?.addEventListener("load", onLoad);
    window.addEventListener("message", onMessage);
    return () => { frame.current?.removeEventListener("load", onLoad); window.removeEventListener("message", onMessage); };
  }, [draft, prices]);

  const changeField = (key: string, value: string) => setDraft(old => ({ ...old, fields: { ...old.fields, [key]: value } }));
  const move = (id: string, step: number) => setDraft(old => {
    const order = [...(old.order ?? initialOrder)];
    const at = order.indexOf(id), next = at + step;
    if (at < 0 || next < 0 || next >= order.length) return old;
    const current = order[at]!;
    order[at] = order[next]!;
    order[next] = current;
    return { ...old, order };
  });
  const toggle = (id: string) => setDraft(old => ({ ...old, hidden: (old.hidden ?? []).includes(id) ? (old.hidden ?? []).filter(x => x !== id) : [...(old.hidden ?? []), id] }));

  const uploadImage = async (key: string, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { setStatus("اختاري صورة بحجم لا يتجاوز ٨ ميجابايت."); return; }
    setUploading(true); setStatus("جارٍ رفع الصورة…");
    const path = `editor/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) { setStatus("تعذر رفع الصورة. تأكد من صلاحية المدير وحاول مرة أخرى."); setUploading(false); return; }
    const nextDraft: SiteContent = { ...draft, fields: { ...draft.fields, [key]: `storage:${path}` } };
    setDraft(nextDraft);
    const { data: preview } = await supabase.storage.from("product-images").createSignedUrl(path, 3600);
    if (preview?.signedUrl) setThumbs(old => ({ ...old, [key]: preview.signedUrl }));
    const { error: saveError } = await supabase.from("storefront_drafts").upsert({ id: true, content: normalizeSiteContent({ ...nextDraft, prices }) as unknown as Json });
    setStatus(saveError ? "تم رفع الصورة لكن تعذر حفظ المسودة، اضغطي «حفظ المسودة»." : "تم رفع الصورة وحفظها في المسودة. اضغطي «نشر التعديلات» لتظهر للزوار.");
    setUploading(false);
  };

  const save = async (publish: boolean) => {
    setBusy(true); setStatus("");
    try {
      const content = normalizeSiteContent({ ...draft, prices: publish ? {} : prices });
      const { error: draftError } = await supabase.from("storefront_drafts").upsert({ id: true, content: content as unknown as Json });
      if (draftError) throw draftError;
      if (publish) {
        for (const product of products) {
          const values = prices[product.id];
          if (!values) continue;
          const regular = Number(values.regular_price), sale = values.sale_price.trim() ? Number(values.sale_price) : null;
          if (!Number.isFinite(regular) || regular <= 0 || (sale !== null && (!Number.isFinite(sale) || sale <= 0 || sale > regular))) throw new Error("راجعي أسعار المنتجات؛ السعر يجب أن يكون أكبر من صفر والتخفيض لا يزيد عن السعر الأساسي.");
          if (regular !== product.regular_price || sale !== product.sale_price) {
            const { error } = await supabase.from("products").update({ regular_price: regular, sale_price: sale }).eq("id", product.id);
            if (error) throw error;
          }
        }
        const { error } = await supabase.from("storefront_published").upsert({ id: true, content: content as unknown as Json });
        if (error) throw error;
        setDraft(content);
        setProducts(old => old.map(p => ({ ...p, regular_price: Number(prices[p.id]?.regular_price ?? p.regular_price), sale_price: prices[p.id]?.sale_price ? Number(prices[p.id]?.sale_price) : null })));
      }
      setStatus(publish ? "تم نشر التعديلات في المتجر." : "تم حفظ المسودة. المتجر للزوار لم يتغير.");
    } catch (error) { setStatus(error instanceof Error && error.message.startsWith("راجعي") ? error.message : "تعذر الحفظ. لم تُنشر التغييرات؛ حاول مرة أخرى."); }
    setBusy(false);
  };

  return <div dir="rtl" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">محرّر الموقع</h1><p className="text-sm text-muted-foreground">عدّلي الصفحة وشاهديها قبل النشر.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void save(false)}><Save />حفظ المسودة</Button><Button disabled={busy || uploading} onClick={() => void save(true)}><Upload />نشر التعديلات</Button></div>
    </div>
    {status && <p role="status" className="rounded-md border bg-card px-4 py-2 text-sm">{status}</p>}
    <div className="grid gap-4 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
      <div className="max-h-[calc(100vh-180px)] space-y-4 overflow-y-auto border bg-card p-4">
        <h2 className="font-bold">أقسام الصفحة</h2>
        <div className="space-y-1">{(draft.order ?? initialOrder).map((id, index) => <div key={id} className={`flex items-center gap-1 rounded-md border p-1 ${selected === id ? "border-primary bg-primary/5" : ""}`}>
          <Button variant="ghost" className="min-w-0 flex-1 justify-start" onClick={() => { setSelected(id); frame.current?.contentWindow?.postMessage({ type: "lashes-scroll", section: id }, window.location.origin); }}>{sectionNames[id]}</Button>
          <Button variant="ghost" size="icon-sm" title="تحريك للأعلى" aria-label={`تحريك ${sectionNames[id]} للأعلى`} disabled={index === 0} onClick={() => move(id, -1)}><ArrowUp /></Button>
          <Button variant="ghost" size="icon-sm" title="تحريك للأسفل" aria-label={`تحريك ${sectionNames[id]} للأسفل`} disabled={index === (draft.order ?? initialOrder).length - 1} onClick={() => move(id, 1)}><ArrowDown /></Button>
          <Button variant="ghost" size="icon-sm" title={draft.hidden?.includes(id) ? "إظهار" : "إخفاء"} aria-label={`${draft.hidden?.includes(id) ? "إظهار" : "إخفاء"} ${sectionNames[id]}`} onClick={() => toggle(id)}>{draft.hidden?.includes(id) ? <EyeOff /> : <Eye />}</Button>
        </div>)}</div>
        <div className="space-y-3 border-t pt-4"><h2 className="font-bold">{sectionNames[selected]}</h2>{editableFields.filter(field => field.section === selected).map(field => <label key={field.key} className="block space-y-1 text-sm"><span>{field.label}</span>{field.kind === "image" ? <><Input type="file" accept="image/*" disabled={uploading} onChange={e => void uploadImage(field.key, e.target.files?.[0])}/>{thumbs[field.key] && <img src={thumbs[field.key]} alt="" className="h-20 w-20 rounded-md border object-cover" />}{draft.fields?.[field.key] && <Button variant="ghost" size="sm" type="button" onClick={() => changeField(field.key, "")}><RotateCcw />الصورة الأصلية</Button>}</> : field.kind === "long" ? <Textarea value={draft.fields?.[field.key] ?? field.defaultValue} onChange={e => changeField(field.key, e.target.value)} /> : <Input value={draft.fields?.[field.key] ?? field.defaultValue} onChange={e => changeField(field.key, e.target.value)} />}</label>)}
          {selected === "services" && <p className="text-sm text-muted-foreground">يمكن تغيير ترتيب هذا القسم وإظهاره.</p>}
        </div>
        {selected === "bundles" || selected === "featured" || selected === "home" ? <div className="space-y-3 border-t pt-4"><h2 className="font-bold">أسعار المنتجات</h2>{products.map(p => <div key={p.id} className="space-y-2 border-b pb-3"><b className="text-sm">{p.name_ar}</b><label className="block text-xs">صورة المنتج<Input type="file" accept="image/*" disabled={uploading} onChange={e => void uploadImage(`productImage.${p.id}`, e.target.files?.[0])}/></label>{thumbs[`productImage.${p.id}`] && <img src={thumbs[`productImage.${p.id}`]} alt="" className="h-20 w-20 rounded-md border object-cover" />}{draft.fields?.[`productImage.${p.id}`] && <Button variant="ghost" size="sm" type="button" onClick={() => changeField(`productImage.${p.id}`, "")}><RotateCcw />الصورة الأصلية</Button>}<div className="grid grid-cols-2 gap-2"><label className="text-xs">السعر الأساسي<Input type="number" min="1" value={prices[p.id]?.regular_price ?? ""} onChange={e => setPrices(old => ({ ...old, [p.id]: { ...old[p.id], regular_price: e.target.value, sale_price: old[p.id]?.sale_price ?? "" } }))}/></label><label className="text-xs">سعر التخفيض<Input type="number" min="1" value={prices[p.id]?.sale_price ?? ""} onChange={e => setPrices(old => ({ ...old, [p.id]: { ...old[p.id], sale_price: e.target.value, regular_price: old[p.id]?.regular_price ?? "" } }))}/></label></div></div>)}</div> : null}
      </div>
      <div className="min-w-0 border bg-muted/30 p-3">
        <div className="mb-3 flex items-center justify-between"><b className="text-sm">معاينة مباشرة</b><div className="flex gap-1"><Button variant={device === "desktop" ? "secondary" : "ghost"} size="icon-sm" title="سطح المكتب" aria-label="معاينة سطح المكتب" onClick={() => setDevice("desktop")}><Monitor /></Button><Button variant={device === "mobile" ? "secondary" : "ghost"} size="icon-sm" title="الجوال" aria-label="معاينة الجوال" onClick={() => setDevice("mobile")}><Smartphone /></Button></div></div>
        <iframe ref={frame} title="معاينة المتجر" src="/?editor-preview=1" className={`mx-auto block h-[calc(100vh-240px)] min-h-[480px] border bg-background transition-[width] ${device === "mobile" ? "w-full max-w-[390px]" : "w-full"}`} />
      </div>
    </div>
  </div>;
}