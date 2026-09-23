import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BriefcaseBusiness, ChevronLeft, Download, ListFilter, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { orderStatus, sar } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Customer = { id: string; full_name: string | null; phone: string | null; email: string | null; orders_count: number; total_spent: number; address?: unknown; notes?: string | null; status?: string | null; last_order_at?: string | null; created_at?: string | null };
type Order = { id: string; order_number: string; customer_id?: string | null; customer_phone: string; total: number; status: string; created_at: string };

const NA = "—";
const txt = (v: string | null | undefined) => (v && v.trim() ? v : NA);
const dateText = (v: string | null) => (v ? new Date(v).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" }) : NA);
const addressText = (a: unknown) => {
  if (a && typeof a === "object") { const r = a as Record<string, unknown>; return [r["city"], r["district"], r["street"]].filter(Boolean).join("، ") || NA; }
  return NA;
};
const cityOf = (c: Customer) => { const a = c.address; return a && typeof a === "object" ? String((a as Record<string, unknown>)["city"] ?? "") : ""; };
const isNew = (c: Customer) => !!c.created_at && Date.now() - new Date(c.created_at).getTime() < 7 * 864e5;
const initials = (name: string) => name.trim().charAt(0) || "ع";

function Field({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return <div className="rounded-md border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium" dir={ltr ? "ltr" : undefined}>{value}</p></div>;
}

type Group={id:string;name:string;description:string|null;color:string};
export function CustomersPage({ customers, orders, onChanged, initialSearch="" }: { customers: Customer[]; orders: Order[]; onChanged: () => Promise<void>; initialSearch?:string }) {
  const [open, setOpen] = useState<Customer | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "blocked">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query,setQuery]=useState(initialSearch);
  const [groups,setGroups]=useState<Group[]>([]);
  const [groupOpen,setGroupOpen]=useState(false);
  const [groupForm,setGroupForm]=useState({name:"",description:""});
  const [page,setPage]=useState(1);
  useEffect(()=>{void supabase.from("customer_groups").select("id,name,description,color").order("created_at").then(({data})=>setGroups((data??[]) as Group[]))},[]);

  const matching = useMemo(() => customers.filter((c) => (filter === "all" ? true : filter === "blocked" ? c.status === "blocked" : c.status !== "blocked") && `${c.full_name??""} ${c.email??""} ${c.phone??""} ${cityOf(c)}`.toLowerCase().includes(query.toLowerCase())), [customers, filter, query]);
  const list=matching.slice((page-1)*10,page*10); const pages=Math.max(1,Math.ceil(matching.length/10));
  const ordersOf = (c: Customer) => orders.filter((o) => o.customer_id === c.id || (!!c.phone && o.customer_phone === c.phone));
  const allChecked = list.length > 0 && list.every(c=>selected.includes(c.id));
  const toggleAll = () => setSelected(allChecked ? [] : list.map((c) => c.id));
  const toggleOne = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const exportCsv = () => {
    const rows = [["الاسم", "الجوال", "البريد", "المدينة", "الطلبات", "إجمالي الإنفاق"], ...list.map((c) => [c.full_name ?? "", c.phone ?? "", c.email ?? "", cityOf(c), String(c.orders_count || ordersOf(c).length), String(c.total_spent)])];
    const csv = "﻿" + rows.map((r) => r.map((x) => `"${x.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveCustomer = async () => {
    if (!form.name.trim()) { setError("اكتب اسم العميل"); return; }
    setSaving(true); setError("");
    const { error: err } = await supabase.from("profiles").insert({ id: crypto.randomUUID(), full_name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, address: form.city.trim() ? { city: form.city.trim() } : {} });
    setSaving(false);
    if (err) { setError("تعذر حفظ العميل، حاول مرة أخرى"); return; }
    setAddOpen(false); setForm({ name: "", phone: "", email: "", city: "" });
    await onChanged();
  };
  const saveGroup=async()=>{if(!groupForm.name.trim())return;const{data,error:err}=await supabase.from("customer_groups").insert({name:groupForm.name.trim(),description:groupForm.description.trim()||null}).select("id,name,description,color").single();if(err){setError("تعذر حفظ المجموعة");return}setGroups(g=>[...g,data as Group]);setGroupOpen(false);setGroupForm({name:"",description:""})};
  const setStatus=async(status:string)=>{if(!selected.length)return;await supabase.from("profiles").update({status}).in("id",selected);setSelected([]);await onChanged()};

  return <div className="space-y-6">
    {/* مسار الصفحة */}
    <p className="text-xs text-muted-foreground">الرئيسية <span className="mx-1">/</span> العملاء</p>

    {/* مجموعات العملاء */}
    <div className="flex items-center gap-2 text-sm font-semibold"><Users className="size-4" />مجموعات العملاء <span className="text-muted-foreground">({groups.length+1} مجموعة)</span></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <button type="button" className="flex flex-col items-center gap-2 rounded-xl border bg-card px-6 py-7 shadow-sm transition hover:shadow" onClick={() => setFilter("all")}>
        <Users className="size-8 text-primary" />
        <b>جميع العملاء</b>
        <span className="text-sm text-muted-foreground">{customers.length} عميل</span>
      </button>
      {groups.map(g=><div key={g.id} className="flex flex-col items-center gap-2 rounded-xl border bg-card px-6 py-7"><Users className="size-8 text-primary"/><b>{g.name}</b><span className="text-center text-xs text-muted-foreground">{g.description||"مجموعة مخصصة"}</span></div>)}
      <button type="button" className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-card px-6 py-7 text-primary shadow-sm transition hover:shadow" onClick={() => setGroupOpen(true)}>
        <Plus className="size-8" />
        <b>مجموعة جديدة</b>
      </button>
    </div>

    {/* تنبيه */}
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
      <ChevronLeft className="size-4 shrink-0" />
      <p className="flex-1 text-left"><AlertTriangle className="ml-2 inline size-4 align-[-2px]" />نظّم عملاءك في مجموعات لتسهيل إرسال العروض والحملات المخصصة لكل مجموعة.</p>
    </div>

    {/* شريط الأدوات */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="gap-1.5"><BriefcaseBusiness className="size-4" />خدمات</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start"><DropdownMenuItem onClick={exportCsv}><Download className="size-4" />تصدير العملاء CSV</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="gap-1.5"><ListFilter className="size-4" />تصفية</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setFilter("all")}>الكل</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("active")}>النشطون</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("blocked")}>المحظورون</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/80" onClick={() => setAddOpen(true)}><Plus className="size-4" />عميل جديد</Button>
    </div>
    <div className="flex flex-wrap gap-2"><Input className="max-w-sm" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="ابحث بالاسم أو الجوال أو البريد"/>{selected.length>0&&<><Button size="sm" variant="outline" onClick={()=>void setStatus("active")}>تفعيل المحدد ({selected.length})</Button><Button size="sm" variant="outline" onClick={()=>void setStatus("blocked")}>حظر المحدد</Button></>}</div>

    {/* قائمة العملاء */}
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="تحديد الكل" />
        <p className="flex items-center gap-2 text-sm font-semibold"><Users className="size-4" />العملاء <span className="text-muted-foreground">({matching.length} عميل)</span></p>
      </div>
      {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">لا توجد عميلات بعد.</p>}
      {list.map((c) => {
        const city = cityOf(c);
        return <div key={c.id} className="flex cursor-pointer items-center justify-between border-b px-4 py-4 last:border-0 hover:bg-muted/40" onClick={() => setOpen(c)}>
          <span className="text-sm text-muted-foreground">{city || NA}</span>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="flex items-center gap-2" onClick={() => setOpen(c)}>
              {isNew(c) && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">جديد</span>}
              <b className="text-sm">{txt(c.full_name)}</b>
            </button>
            <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{initials(txt(c.full_name))}</span>
            <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggleOne(c.id)} aria-label={`تحديد ${txt(c.full_name)}`} />
          </div>
        </div>;
      })}
      {matching.length>10&&<div className="flex justify-center gap-3 border-t p-3"><Button size="sm" variant="outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>السابق</Button><span className="grid place-items-center text-xs">{page} / {pages}</span><Button size="sm" variant="outline" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>التالي</Button></div>}
    </section>

    {/* بطاقة العميل */}
    <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent dir="rtl" className="max-w-2xl"><DialogHeader><DialogTitle>{txt(open?.full_name)}</DialogTitle></DialogHeader>
        {open && <div className="space-y-5 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الهاتف" value={txt(open.phone)} ltr />
            <Field label="البريد الإلكتروني" value={txt(open.email)} ltr />
            <Field label="العنوان" value={addressText(open.address)} />
            <Field label="عدد الطلبات" value={String(open.orders_count || ordersOf(open).length)} />
            <Field label="إجمالي الإنفاق" value={sar(Number(open.total_spent))} />
            <Field label="آخر طلب" value={dateText(ordersOf(open)[0]?.created_at ?? open.last_order_at ?? null)} />
            <Field label="حالة الحساب" value={open.status === "blocked" ? "محظور" : open.status === "inactive" ? "غير نشط" : "نشط"} />
            <Field label="ملاحظات" value={txt(open.notes)} />
          </div>
          <div><p className="mb-2 font-semibold">سجل الطلبات</p>
            {ordersOf(open).length ? <Table><TableHeader><TableRow><TableHead>الطلب</TableHead><TableHead>التاريخ</TableHead><TableHead>الإجمالي</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
              <TableBody>{ordersOf(open).map((o) => <TableRow key={o.id}><TableCell dir="ltr">#{o.order_number}</TableCell><TableCell>{dateText(o.created_at)}</TableCell><TableCell>{sar(Number(o.total))}</TableCell><TableCell>{orderStatus[o.status] ?? o.status}</TableCell></TableRow>)}</TableBody></Table>
              : <p className="text-muted-foreground">{NA}</p>}
          </div>
        </div>}
      </DialogContent>
    </Dialog>

    {/* إضافة عميل جديد */}
    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>عميل جديد</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <label className="block space-y-1 text-sm"><span>اسم العميل *</span><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: سارة محمد" /></label>
          <label className="block space-y-1 text-sm"><span>رقم الجوال</span><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05xxxxxxxx" /></label>
          <label className="block space-y-1 text-sm"><span>البريد الإلكتروني</span><Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="customer@email.com" /></label>
          <label className="block space-y-1 text-sm"><span>المدينة</span><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="الرياض" /></label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={saving} onClick={() => void saveCustomer()}>{saving ? "جارٍ الحفظ..." : "حفظ العميل"}</Button>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={groupOpen} onOpenChange={setGroupOpen}><DialogContent dir="rtl"><DialogHeader><DialogTitle>مجموعة عملاء جديدة</DialogTitle></DialogHeader><Input value={groupForm.name} onChange={e=>setGroupForm({...groupForm,name:e.target.value})} placeholder="اسم المجموعة"/><Input value={groupForm.description} onChange={e=>setGroupForm({...groupForm,description:e.target.value})} placeholder="وصف مختصر"/><Button onClick={()=>void saveGroup()}>حفظ المجموعة</Button></DialogContent></Dialog>
  </div>;
}
