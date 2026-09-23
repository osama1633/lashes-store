import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Truck,
  Check,
  Gift,
  Clock,
  Timer,
  FileX,
  Filter,
  CalendarDays,
  Printer,
  Save,
  ChevronLeft,
  User,
  Loader2,
  Pencil,
  Users,
  Receipt,
  ReceiptText,
  ListChecks,
  FileText,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { orderStatus, sar, type Product } from "@/lib/store";

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  created_at: string;
  order_items?: { product_name: string; quantity: number }[];
};

type Line = { product_id: string; quantity: number };

const STAT_CARDS = [
  { key: "cancelled", label: "محذوف", icon: FileX, dot: "bg-rose-500" },
  { key: "new", label: "بانتظار الدفع", icon: Timer, dot: "bg-rose-400" },
  { key: "processing", label: "بانتظار المراجعة", icon: Clock, dot: "bg-slate-800" },
  { key: "shipped", label: "قيد التنفيذ", icon: Gift, dot: "bg-sky-500" },
  { key: "delivered", label: "تم التنفيذ", icon: Check, dot: "bg-emerald-500" },
  { key: "refunded", label: "جاري التوصيل", icon: Truck, dot: "bg-emerald-500" },
] as const;

const relative = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "اليوم";
  if (days < 7) return `منذ ${days} يوم`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "منذ أسبوع" : weeks === 2 ? "منذ أسبوعين" : `منذ ${weeks} أسابيع`;
};

export function OrdersPage({
  orders,
  products,
  onUpdate,
  onReload,
  initialSearch = "",
}: {
  orders: Order[];
  products: Product[];
  onUpdate: (id: string, status: string) => void;
  onReload: () => void | Promise<void>;
  initialSearch?: string;
}) {
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState(initialSearch);
  const [page, setPage] = useState(1);

  if (creating) {
    return (
      <NewOrder
        products={products}
        onClose={() => setCreating(false)}
        onCreated={async () => {
          setCreating(false);
          await onReload();
        }}
      />
    );
  }

  const matching = orders.filter((order) => (filter === "all" || order.status === filter) && `${order.order_number} ${order.customer_name} ${order.customer_phone}`.toLowerCase().includes(query.toLowerCase()));
  const pages = Math.max(1, Math.ceil(matching.length / 10));
  const list = matching.slice((page - 1) * 10, page * 10);

  const toggleAll = () =>
    setSelected((prev) => (prev.size === list.length ? new Set() : new Set(list.map((o) => o.id))));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectedOrders = orders.filter((o) => selected.has(o.id));

  async function bulkStatus(status: string) {
    if (selected.size === 0) {
      toast.error("حدد طلباً واحداً على الأقل");
      return;
    }
    const { error } = await supabase
      .from("orders")
      .update({ status } as never)
      .in("id", [...selected]);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم تحديث حالة الطلبات المحددة");
    setSelected(new Set());
    await onReload();
  }

  async function deleteSelected() {
    if (selected.size === 0) {
      toast.error("حدد طلباً واحداً على الأقل");
      return;
    }
    if (!confirm(`هل تريد حذف ${selected.size} طلب؟ لا يمكن التراجع عن ذلك.`)) return;
    const ids = [...selected];
    await supabase.from("order_items").delete().in("order_id", ids);
    const { error } = await supabase.from("orders").delete().in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم حذف الطلبات المحددة");
    setSelected(new Set());
    await onReload();
  }

  function exportCsv() {
    if (selected.size === 0) {
      toast.error("حدد طلباً واحداً على الأقل");
      return;
    }
    const rows = [
      ["رقم الطلب", "العميل", "الجوال", "الحالة", "الإجمالي", "التاريخ"],
      ...selectedOrders.map((o) => [
        o.order_number,
        o.customer_name,
        o.customer_phone,
        orderStatus[o.status] ?? o.status,
        String(o.total),
        new Date(o.created_at).toLocaleDateString("ar-SA"),
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function printSelected() {
    if (selected.size === 0) {
      toast.error("حدد طلباً واحداً على الأقل");
      return;
    }
    window.print();
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button className="gap-2" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> طلب جديد
          </Button>
          <div className="relative min-w-52"><Input value={query} onChange={(e)=>{setQuery(e.target.value);setPage(1)}} placeholder="ابحث في الطلبات" className="h-9"/></div>
        </div>
        <nav className="text-sm text-muted-foreground">الرئيسية / الطلبات</nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {STAT_CARDS.map((card) => {
          const count = orders.filter((order) => order.status === card.key).length;
          const active = filter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setFilter(active ? "all" : card.key)}
              className={`rounded-xl border bg-card p-4 text-right transition hover:shadow-sm ${
                active ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-2xl font-bold text-foreground">{count}</span>
                <card.icon className="size-5" />
              </div>
              <div className="mt-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                {card.label}
                <span className={`size-2 rounded-full ${card.dot}`} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Pencil className="size-4" /> تحرير سريع
                  {selected.size > 0 && (
                    <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {selected.size}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <RefreshCw className="size-4" /> تعديل حالة الطلب
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {Object.entries(orderStatus).map(([value, label]) => (
                      <DropdownMenuItem key={value} onClick={() => void bulkStatus(value)}>
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem className="gap-2" onClick={printSelected}>
                  <Receipt className="size-4" /> طباعة الفواتير
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={printSelected}>
                  <ReceiptText className="size-4" /> طباعة ملخص الفواتير
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={printSelected}>
                  <ListChecks className="size-4" /> طباعة قوائم التجهيز
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={printSelected}>
                  <FileText className="size-4" /> طباعة البوليصات
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={exportCsv}>
                  <Download className="size-4" /> تصدير الطلبات
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={() => void deleteSelected()}
                >
                  <Trash2 className="size-4" /> حذف الطلب
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={list.length > 0 && selected.size === list.length}
                onCheckedChange={toggleAll}
                aria-label="تحديد الكل"
              />
              تحديد الكل
            </label>
          </div>
          <b>الطلبات</b>
        </div>
        <ul className="divide-y">
          {list.length === 0 && (
            <li className="p-8 text-center text-sm text-muted-foreground">لا توجد طلبات</li>
          )}
          {list.map((order) => (
            <li
              key={order.id}
              className={`flex flex-wrap items-center gap-4 px-5 py-4 ${selected.has(order.id) ? "bg-muted/40" : ""}`}
            >
              <Checkbox
                checked={selected.has(order.id)}
                onCheckedChange={() => toggleOne(order.id)}
                aria-label={`تحديد الطلب ${order.order_number}`}
              />
              <div className="min-w-[220px] flex-1 text-right">
                <b>{order.customer_name}</b>
                <div className="mt-1 flex flex-wrap items-center justify-end gap-3 text-xs text-muted-foreground">
                  <span>#{order.order_number}</span>
                  <span>{order.customer_phone}</span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    {orderStatus[order.status]}
                  </span>
                </div>
              </div>
              <strong className="w-24 text-sm">{sar(Number(order.total))}</strong>
              <Select value={order.status} onValueChange={(value) => onUpdate(order.id, value)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(orderStatus).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="w-24 text-xs text-muted-foreground">
                {relative(order.created_at)}
              </span>
            </li>
          ))}
        </ul>
        {matching.length>10&&<div className="flex items-center justify-center gap-3 border-t p-3"><Button size="sm" variant="outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>السابق</Button><span className="text-xs text-muted-foreground">{page} / {pages}</span><Button size="sm" variant="outline" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>التالي</Button></div>}
      </div>
    </section>
  );
}

function NewOrder({
  products,
  onClose,
  onCreated,
}: {
  products: Product[];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [payment, setPayment] = useState("cod");
  const [shipping, setShipping] = useState("لا يتطلب شحن / توصيل");
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const orderNumber = useMemo(() => String(Date.now()).slice(-9), []);
  const priceOf = (product: Product) => Number(product.sale_price ?? product.regular_price);
  const rows = lines.map((line) => ({
    line,
    product: products.find((item) => item.id === line.product_id),
  }));
  const total = rows.reduce(
    (sum, row) => sum + (row.product ? priceOf(row.product) * row.line.quantity : 0),
    0,
  );
  const saveDraft = () => {
    localStorage.setItem("lashes-order-draft", JSON.stringify({ name, phone, city, payment, shipping, lines, savedAt: new Date().toISOString() }));
    toast.success("تم حفظ المسودة على هذا الجهاز");
    onClose();
  };

  async function create() {
    setError("");
    if (!name.trim() || !phone.trim()) return setError("اكتب اسم العميل ورقم جواله");
    if (rows.length === 0 || rows.some((row) => !row.product))
      return setError("أضف منتجاً واحداً على الأقل");
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: auth.user?.id ?? null,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        shipping_address: { city },
        subtotal: total,
        total,
        payment_method: payment,
        shipping_method: shipping,
      })
      .select("id")
      .single();
    if (orderError || !order) {
      setBusy(false);
      setError(orderError?.message ?? "تعذّر إنشاء الطلب");
      return;
    }
    const { error: itemsError } = await supabase.from("order_items").insert(
      rows.map(({ line, product }) => ({
        order_id: order.id,
        product_id: product!.id,
        product_name: product!.name_ar,
        sku: product!.sku,
        unit_price: priceOf(product!),
        quantity: line.quantity,
        line_total: priceOf(product!) * line.quantity,
      })),
    );
    setBusy(false);
    if (itemsError) {
      setError(itemsError.message);
      return;
    }
    await onCreated();
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1" onClick={onClose}>
          رجوع <ChevronLeft className="size-4" />
        </Button>
        <nav className="text-sm text-muted-foreground">الرئيسية / الطلبات / إنشاء طلب</nav>
      </div>

      <div className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3">
        <div className="text-right">
          <small className="text-muted-foreground"># الطلب رقم</small>
          <p className="mt-1 font-bold">{orderNumber}</p>
        </div>
        <div className="text-right">
          <small className="text-muted-foreground">تاريخ الطلب</small>
          <p className="mt-1 font-bold">{new Date().toLocaleString("ar-SA")}</p>
        </div>
        <div className="text-right">
          <small className="text-muted-foreground">حالة الطلب</small>
          <p className="mt-1 font-bold">جديد</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <b className="block text-right">العميل</b>
          <div className="mt-4 space-y-3">
            <div>
              <Label>اسم العميل</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <Label>رقم الجوال</Label>
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="05xxxxxxxx"
              />
            </div>
            {!name && (
              <div className="grid place-items-center py-2 text-muted-foreground">
                <User className="size-10" />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <b className="block text-right">الشحن</b>
          <div className="mt-4 space-y-3">
            <div>
              <Label>طريقة الشحن</Label>
              <Input value={shipping} onChange={(event) => setShipping(event.target.value)} />
            </div>
            <div>
              <Label>المدينة</Label>
              <Input value={city} onChange={(event) => setCity(event.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <b className="block text-right">الدفع</b>
          <div className="mt-4">
            <Label>طريقة الدفع</Label>
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cod">الدفع عند الاستلام</SelectItem>
                <SelectItem value="card">بطاقة مدى / Visa</SelectItem>
                <SelectItem value="applepay">Apple Pay</SelectItem>
                <SelectItem value="transfer">تحويل بنكي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              setLines((current) => [
                ...current,
                { product_id: products[0]?.id ?? "", quantity: 1 },
              ])
            }
          >
            <Plus className="size-4" /> اضافة منتج
          </Button>
          <b>المنتجات</b>
        </div>
        <div className="divide-y">
          <div className="grid grid-cols-[1fr_90px_110px_110px_40px] gap-3 px-5 py-2 text-xs text-muted-foreground">
            <span>المنتج</span>
            <span>الكمية</span>
            <span>السعر</span>
            <span>المجموع</span>
            <span />
          </div>
          {rows.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              لم تُضف منتجات بعد
            </p>
          )}
          {rows.map(({ line, product }, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_90px_110px_110px_40px] items-center gap-3 px-5 py-3"
            >
              <Select
                value={line.product_id}
                onValueChange={(value) =>
                  setLines((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, product_id: value } : row,
                    ),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر منتجاً" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index
                        ? { ...row, quantity: Math.max(1, Number(event.target.value) || 1) }
                        : row,
                    ),
                  )
                }
              />
              <span className="text-sm">{product ? sar(priceOf(product)) : "—"}</span>
              <span className="text-sm font-semibold">
                {product ? sar(priceOf(product) * line.quantity) : "—"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="حذف المنتج"
                onClick={() =>
                  setLines((current) => current.filter((_, rowIndex) => rowIndex !== index))
                }
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b px-5 py-3 text-right">
          <b>ملخص الطلب</b>
        </div>
        <div className="divide-y text-sm">
          <div className="flex items-center justify-between px-5 py-3">
            <span>{sar(total)}</span>
            <span className="text-muted-foreground">مجموع السلة</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <strong>{sar(total)}</strong>
            <span className="text-muted-foreground">إجمالي الطلب</span>
          </div>
        </div>
      </div>

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center justify-center gap-3 pb-4">
        <Button className="gap-2" disabled={busy} onClick={() => void create()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          إنشاء الطلب
        </Button>
        <Button variant="outline" className="gap-2 text-destructive" onClick={() => { if (confirm("هل تريد إلغاء هذا الطلب غير المحفوظ؟")) onClose(); }}>
          <Trash2 className="size-4" /> إلغاء الطلب
        </Button>
        <Button variant="outline" className="gap-2" onClick={saveDraft}>
          <Save className="size-4" /> حفظ كمسودة
        </Button>
      </div>
    </section>
  );
}
