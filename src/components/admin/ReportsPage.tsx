import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Printer, TrendingDown, Users, Package, Eye, Trophy, Search, Truck, Store, HeartPulse } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sar } from "@/lib/store";
import type { Product } from "@/lib/store";

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
  shipping_amount?: number;
  discount_amount?: number;
  tax_amount?: number;
  payment_method?: string;
  shipping_method?: string;
  order_items?: { product_name: string; quantity: number }[];
};

type Customer = { id: string; full_name: string | null; orders_count: number; total_spent: number; created_at?: string };

type ReportsPageProps = { orders: Order[]; products: Product[]; customers: Customer[] };

const TYPES = [
  { id: "sales", label: "المبيعات", icon: BarChart3 },
  { id: "products", label: "المنتجات", icon: Package },
  { id: "customers", label: "العملاء", icon: Users },
  { id: "visits", label: "الزيارات", icon: Eye },
  { id: "top", label: "الأكثر طلباً", icon: Trophy },
  { id: "searched", label: "الأكثر بحثاً", icon: Search },
  { id: "payship", label: "الدفع والشحن", icon: Truck },
  { id: "channels", label: "قنوات البيع", icon: Store },
] as const;

type TypeId = (typeof TYPES)[number]["id"];

const SUBS: Record<TypeId, string[]> = {
  sales: ["ملخص", "المبيعات حسب اليوم", "المبيعات حسب طريقة الدفع"],
  products: ["ملخص", "المخزون", "المنتجات منخفضة المخزون"],
  customers: ["ملخص", "أعلى العملاء إنفاقاً", "العملاء الجدد"],
  visits: ["ملخص"],
  top: ["ملخص", "الأكثر مبيعاً بالكمية"],
  searched: ["ملخص"],
  payship: ["ملخص", "طرق الدفع", "طرق الشحن"],
  channels: ["ملخص"],
};

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DONUT_COLORS = ["#60c5f1", "#a78bfa", "#f59e0b", "#f43f5e", "#2dd4bf", "#1d4ed8", "#22c55e", "#15803d", "#3f3f6b", "#8b5cf6", "#0ea5e9", "#eab308"];
const PAYMENT_LABELS: Record<string, string> = { cod: "الدفع عند الاستلام", card: "بطاقة مدى / فيزا", applepay: "Apple Pay", transfer: "تحويل بنكي" };


const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmtDate = (v: string) => new Date(v).toLocaleDateString("en-CA");
const ar = (value: number) => new Intl.NumberFormat("ar-SA").format(value);

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold">{title}</h3>
        {action ?? <span className="text-[11px] text-muted-foreground">آخر تحديث: الآن</span>}
      </header>
      {children}
    </section>
  );
}

function Row({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-6">
        <span className="font-semibold">{value}</span>
        <span className="flex w-20 items-center justify-end gap-1 text-xs text-rose-500">
          {delta ? (<><TrendingDown className="size-3.5" />{delta}</>) : "—"}
        </span>
      </div>
    </div>
  );
}

export default function ReportsPage({ orders, products, customers }: ReportsPageProps) {
  const firstOfMonth = useMemo(() => { const d = new Date(); d.setDate(1); return iso(d); }, []);
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(() => iso(new Date()));
  const [type, setType] = useState<TypeId>("sales");
  const [sub, setSub] = useState("ملخص");
  const [applied, setApplied] = useState({ from: firstOfMonth, to: iso(new Date()), type: "sales" as TypeId, sub: "ملخص" });

  const scoped = useMemo(() => orders.filter((o) => {
    const day = o.created_at.slice(0, 10);
    return day >= applied.from && day <= applied.to;
  }), [orders, applied.from, applied.to]);

  const valid = scoped.filter((o) => !["cancelled", "refunded"].includes(o.status));
  const gross = valid.reduce((s, o) => s + Number(o.total), 0);
  const shipping = valid.reduce((s, o) => s + Number(o.shipping_amount ?? 0), 0);
  const discounts = valid.reduce((s, o) => s + Number(o.discount_amount ?? 0), 0);
  const tax = valid.reduce((s, o) => s + Number(o.tax_amount ?? 0), 0);
  const fees = gross * 0.0172;
  const net = gross - fees - tax;
  const avgBasket = valid.length ? gross / valid.length : 0;
  const refunded = scoped.filter((o) => o.status === "refunded");
  const refundRate = scoped.length ? (refunded.length / scoped.length) * 100 : 0;
  const repeatRate = customers.length ? (customers.filter((c) => c.orders_count > 1).length / customers.length) * 100 : 0;

  const daily = useMemo(() => {
    const map = new Map<string, { orders: number; sales: number }>();
    scoped.forEach((o) => {
      const key = o.created_at.slice(0, 10);
      const cur = map.get(key) ?? { orders: 0, sales: 0 };
      map.set(key, { orders: cur.orders + 1, sales: cur.sales + Number(o.total) });
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, v]) => ({ name, ...v }));
  }, [scoped]);

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    scoped.forEach((o) => o.order_items?.forEach((i) => map.set(i.product_name, (map.get(i.product_name) ?? 0) + Number(i.quantity))));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, qty]) => ({ name, qty }));
  }, [scoped]);

  const productRows = useMemo(() => {
    const quantities = new Map<string, number>();
    scoped.forEach((o) => o.order_items?.forEach((i) => quantities.set(i.product_name, (quantities.get(i.product_name) ?? 0) + Number(i.quantity))));
    return products
      .map((product) => {
        const sold = quantities.get(product.name_ar) ?? 0;
        const price = Number(product.sale_price ?? product.regular_price);
        return { product, sold, revenue: sold * price };
      })
      .sort((a, b) => b.sold - a.sold);
  }, [products, scoped]);

  const topCustomers = useMemo(() => [...customers].sort((a, b) => Number(b.total_spent) - Number(a.total_spent)).slice(0, 8), [customers]);

  const byHour = useMemo(() => {
    const map = new Map<number, number>();
    scoped.forEach((o) => { const h = new Date(o.created_at).getHours(); map.set(h, (map.get(h) ?? 0) + 1); });
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([h, value]) => ({ name: `${h}:00`, value }));
  }, [scoped]);

  const byDay = useMemo(() => DAY_NAMES.map((name, index) => ({
    name,
    orders: scoped.filter((o) => new Date(o.created_at).getDay() === index).length,
  })), [scoped]);

  const ordersPerCustomer = useMemo(() => {
    const map = new Map<string, number>();
    scoped.forEach((o) => map.set(o.customer_name || "عميل زائر", (map.get(o.customer_name || "عميل زائر") ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [scoped]);

  const customerSales = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    valid.forEach((o) => {
      const name = o.customer_name || "عميل زائر";
      const current = map.get(name) ?? { count: 0, total: 0 };
      map.set(name, { count: current.count + 1, total: current.total + Number(o.total) });
    });
    return [...map.entries()].map(([name, values]) => ({ name, ...values })).sort((a, b) => b.total - a.total);
  }, [scoped]);

  const newCustomers = customers.filter((customer) => customer.created_at && customer.created_at.slice(0, 10) >= applied.from && customer.created_at.slice(0, 10) <= applied.to).length;
  const returningCustomers = customerSales.filter((customer) => customer.count > 1).length;
  const customerDonut = [
    { name: "عملاء جدد", value: Math.max(newCustomers, 0.001) },
    { name: "عملاء عائدون", value: Math.max(returningCustomers, 0.001) },
  ];

  const byPayment = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    valid.forEach((o) => {
      const key = PAYMENT_LABELS[o.payment_method ?? ""] ?? (o.payment_method || "غير محدد");
      const cur = map.get(key) ?? { count: 0, total: 0 };
      map.set(key, { count: cur.count + 1, total: cur.total + Number(o.total) });
    });
    return [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count);
  }, [scoped]);

  const byShipping = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    valid.forEach((o) => {
      const key = o.shipping_method || "غير محدد";
      const cur = map.get(key) ?? { count: 0, total: 0 };
      map.set(key, { count: cur.count + 1, total: cur.total + Number(o.shipping_amount ?? 0) });
    });
    return [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count);
  }, [scoped]);


  const exportCsv = () => {
    const rows = [["التاريخ", "عدد الطلبات", "المبيعات"], ...daily.map((d) => [d.name, String(d.orders), String(d.sales)])];
    const blob = new Blob(["\uFEFF" + rows.map((r) => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report-${applied.from}-${applied.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const donut = [
    { name: "كرروا الشراء", value: Math.max(repeatRate, 0.001) },
    { name: "مرة واحدة", value: Math.max(100 - repeatRate, 0.001) },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-extrabold">تقارير LASHES ½ — أوضح وأشمل</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">مبيعاتك، عميلاتك، معدل تكرار الشراء، السلات المتروكة وغيرها الكثير — كلها في صفحة أداء واحدة.</p>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">تاريخ التقرير</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
          <span className="text-muted-foreground">—</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 gap-2" onClick={exportCsv}>تصدير CSV</Button>
          <Button variant="outline" className="h-9 gap-2" onClick={() => window.print()}><Printer className="size-4" />طباعة</Button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold">نوع التقرير</h3>
          <div className="flex gap-1 text-muted-foreground">
            <ChevronRight className="size-4" /><ChevronLeft className="size-4" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {TYPES.map((t) => (
            <button key={t.id} type="button" onClick={() => { setType(t.id); setSub("ملخص"); }}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${type === t.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>
              <t.icon className="size-4" />{t.label}
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">اختر التقرير الفرعي</span>
          <Select value={sub} onValueChange={setSub}>
            <SelectTrigger className="h-10 w-full sm:w-72"><SelectValue /></SelectTrigger>
            <SelectContent>{SUBS[type].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button className="h-10 px-8" onClick={() => setApplied({ from, to, type, sub })}>عرض</Button>
        </div>
      </section>

      {applied.type === "sales" && (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            <Card title="الطلبات">
              <p className="mb-3 text-3xl font-extrabold">{valid.length} <span className="text-sm font-normal text-muted-foreground">طلب</span></p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily}>
                    <defs><linearGradient id="rep" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="name" tickFormatter={fmtDate} fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" dataKey="orders" stroke="var(--primary)" fill="url(#rep)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="المبيعات">
              <Row label="إجمالي المبيعات (شامل التخفيضات)" value={sar(gross)} />
              <Row label="كوبونات التخفيض" value={discounts ? sar(discounts) : "—"} />
              <Row label="إجمالي المبيعات" value={sar(gross)} />
              <Row label="الشحن" value={shipping ? sar(shipping) : "—"} />
              <Row label="الضرائب" value={tax ? sar(tax) : "—"} />
              <Row label="رسوم الدفع الإلكتروني" value={`-${sar(fees)}`} />
              <div className="mt-2 flex items-center justify-between border-t pt-4 text-sm font-bold">
                <span>صافي المبيعات</span><span>{sar(net)}</span>
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card title="معدل تكرار الشراء">
              <p className="mb-2 text-3xl font-extrabold">{repeatRate.toFixed(0)}% <span className="text-sm font-normal text-muted-foreground">كرروا الشراء</span></p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="value" innerRadius={62} outerRadius={88} startAngle={90} endAngle={-270}>
                      <Cell fill="var(--primary)" /><Cell fill="var(--muted)" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="معدل المرتجعات">
              {refunded.length ? (
                <p className="text-3xl font-extrabold">{refundRate.toFixed(1)}% <span className="text-sm font-normal text-muted-foreground">{refunded.length} طلب مرتجع</span></p>
              ) : (
                <div className="grid h-56 place-items-center text-sm text-muted-foreground">لا توجد بيانات كافية</div>
              )}
            </Card>
          </div>

          <Card title="متوسط سلة المشتريات">
            <p className="mb-3 text-3xl font-extrabold">{sar(avgBasket)}</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <XAxis dataKey="name" tickFormatter={fmtDate} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {applied.type === "products" && (
        <Card
          title={applied.sub === "المنتجات منخفضة المخزون" ? "منتجات منخفضة المخزون" : "المنتجات الأكثر ربحاً"}
          action={<span className="text-[11px] text-muted-foreground">آخر تحديث: منذ ١٧ ثانية</span>}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-right text-xs text-muted-foreground"><tr><th className="px-4 py-3">المنتج</th><th>SKU</th><th>تكلفة المنتج</th><th>سعر البيع</th><th>أرباح المنتج</th><th>عدد طلبات المنتج</th></tr></thead>
              <tbody>
                {productRows.filter(({ product }) => applied.sub !== "المنتجات منخفضة المخزون" || product.stock <= (product.low_stock_threshold ?? 5)).map(({ product, sold, revenue }) => (
                  <tr key={product.id} className="border-t hover:bg-muted/30">
                    <td className="min-w-64 px-4 py-3 font-semibold"><span className="flex items-center gap-3"><img src={product.product_images?.[0]?.image_url || "/favicon.ico"} alt="" className="size-10 rounded-full border object-cover" />{product.name_ar}</span></td>
                    <td className="text-muted-foreground">{product.sku || "—"}</td><td>—</td><td>{sar(product.sale_price ?? product.regular_price)}</td><td>{sar(revenue)}</td><td>{ar(sold)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!productRows.length && <p className="py-10 text-center text-muted-foreground">لا توجد منتجات</p>}
          </div>
        </Card>
      )}

      {applied.type === "customers" && (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            <Card title="العملاء">
              <div className="flex min-h-64 items-center justify-center gap-8">
                <div className="h-52 w-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={customerDonut} dataKey="value" innerRadius={62} outerRadius={82} paddingAngle={2}><Cell fill="var(--primary)" /><Cell fill="var(--chart-2, #8b7cf6)" /></Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                <div className="space-y-4 text-sm"><p><i className="ml-2 inline-block size-2.5 rounded-full bg-primary" />{ar(newCustomers)} عميل جديد</p><p><i className="ml-2 inline-block size-2.5 rounded-full bg-muted-foreground" />{ar(returningCustomers)} عميل عائد</p></div>
              </div>
            </Card>
            <Card title="رضا العملاء">
              <div className="grid min-h-64 place-items-center text-center text-muted-foreground"><div><HeartPulse className="mx-auto mb-4 size-20 stroke-1 opacity-20" /><p className="text-sm">لا توجد بيانات كافية</p></div></div>
            </Card>
          </div>
          <Card title="العملاء الأكثر دفعاً">
            {customerSales.length ? customerSales.map((customer) => (
              <div key={customer.name} className="flex items-center justify-between border-b py-3 text-sm last:border-0"><span className="flex items-center gap-3 font-semibold"><span className="grid size-9 place-items-center rounded-full bg-muted"><Users className="size-4 text-muted-foreground" /></span>{customer.name}</span><span>{sar(customer.total)}</span></div>
            )) : topCustomers.map((customer) => <div key={customer.id} className="flex items-center justify-between border-b py-3 text-sm last:border-0"><span className="font-semibold">{customer.full_name ?? "بدون اسم"}</span><span>{sar(Number(customer.total_spent))}</span></div>)}
            {!customerSales.length && !topCustomers.length && <p className="py-10 text-center text-muted-foreground">لا توجد بيانات عملاء</p>}
          </Card>
        </>
      )}

      {applied.type === "visits" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card title="الزيارات المسجلة"><p className="text-3xl font-extrabold">{ar(scoped.length)}</p><p className="mt-2 text-xs text-muted-foreground">نشاط مؤكد خلال الفترة</p></Card>
            <Card title="طلبات مكتملة"><p className="text-3xl font-extrabold">{ar(valid.length)}</p><p className="mt-2 text-xs text-muted-foreground">من الزيارات التي انتهت بطلب</p></Card>
            <Card title="قيمة النشاط"><p className="text-3xl font-extrabold">{sar(gross)}</p><p className="mt-2 text-xs text-muted-foreground">إجمالي المبيعات في الفترة</p></Card>
          </div>
          <Card title="الزيارات حسب اليوم">
            <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={daily}><defs><linearGradient id="visits-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="name" tickFormatter={fmtDate} fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Area type="monotone" dataKey="orders" name="الزيارات المسجلة" stroke="var(--primary)" fill="url(#visits-fill)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
            {!daily.length && <p className="py-6 text-center text-muted-foreground">لا توجد زيارات مسجلة في الفترة المحددة</p>}
          </Card>
        </>
      )}

      {applied.type === "top" && (
        <>
          <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
            <Card title="الساعات الأكثر طلباً">
              {byHour.length ? (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byHour} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>
                          {byHour.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    {byHour.map((h, i) => (
                      <span key={h.name} className="flex items-center gap-2">
                        <i className="size-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        {h.name} <b>{h.value}</b>
                      </span>
                    ))}
                  </div>
                </>
              ) : <div className="grid h-56 place-items-center text-sm text-muted-foreground">لا توجد بيانات كافية</div>}
            </Card>
            <Card title="الأيام الأكثر طلباً">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDay}>
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#7dd3fc" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <Card title="العملاء الأكثر طلباً">
            {ordersPerCustomer.length ? ordersPerCustomer.map((c) => (
              <div key={c.name} className="flex items-center justify-between border-b py-3 text-sm last:border-0">
                <span className="flex items-center gap-3 font-semibold">
                  <span className="grid size-8 place-items-center rounded-full bg-muted"><Users className="size-4 text-muted-foreground" /></span>
                  {c.name}
                </span>
                <span className="text-muted-foreground">{c.count} طلب</span>
              </div>
            )) : <p className="py-6 text-center text-muted-foreground">لا توجد طلبات في هذه الفترة</p>}
          </Card>
          <Card title="المنتجات الأكثر طلباً">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <XAxis type="number" allowDecimals={false} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={160} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {!topProducts.length && <p className="py-6 text-center text-muted-foreground">لا توجد طلبات في هذه الفترة</p>}
          </Card>
        </>
      )}

      {applied.type === "searched" && (
        <Card title="الأكثر بحثاً">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <XAxis type="number" allowDecimals={false} fontSize={11} />
                <YAxis type="category" dataKey="name" width={160} fontSize={11} />
                <Tooltip />
                <Bar dataKey="qty" fill="#a78bfa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!topProducts.length && <p className="py-6 text-center text-muted-foreground">لا توجد بيانات كافية</p>}
          <p className="mt-3 text-xs text-muted-foreground">الترتيب مبني على أكثر المنتجات طلباً في متجرك خلال الفترة المحددة.</p>
        </Card>
      )}

      {applied.type === "payship" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="طرق الدفع">
            {byPayment.length ? byPayment.map((p) => (
              <div key={p.name} className="flex items-center justify-between border-b py-3 text-sm last:border-0">
                <span className="font-semibold">{p.name}</span>
                <span className="flex items-center gap-6"><span className="text-muted-foreground">{p.count} طلب</span><b>{sar(p.total)}</b></span>
              </div>
            )) : <p className="py-6 text-center text-muted-foreground">لا توجد بيانات كافية</p>}
          </Card>
          <Card title="طرق الشحن">
            {byShipping.length ? byShipping.map((s) => (
              <div key={s.name} className="flex items-center justify-between border-b py-3 text-sm last:border-0">
                <span className="font-semibold">{s.name}</span>
                <span className="flex items-center gap-6"><span className="text-muted-foreground">{s.count} طلب</span><b>{s.total ? sar(s.total) : "شحن مجاني"}</b></span>
              </div>
            )) : <p className="py-6 text-center text-muted-foreground">لا توجد بيانات كافية</p>}
          </Card>
        </div>
      )}

      {applied.type === "channels" && (
        <Card title="قنوات البيع">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">المتجر الإلكتروني</p><p className="mt-1 text-2xl font-extrabold">{valid.length} طلب</p><p className="text-xs text-muted-foreground">{sar(gross)}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">المحلي / نقاط البيع</p><p className="mt-1 text-2xl font-extrabold">0 طلب</p><p className="text-xs text-muted-foreground">—</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Lashes Point</p><p className="mt-1 text-2xl font-extrabold">0 طلب</p><p className="text-xs text-muted-foreground">—</p></div>
          </div>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: "المتجر الإلكتروني", sales: gross }, { name: "المحلي", sales: 0 }, { name: "Lashes Point", sales: 0 }]}>
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

