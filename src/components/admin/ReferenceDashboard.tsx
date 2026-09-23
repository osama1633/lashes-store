import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronLeft,
  CircleHelp,
  MapPin,
  Package,
  ShoppingBag,
  Trophy,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/store";

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  payment_method?: string;
  shipping_address?: { city?: string } | null;
  created_at: string;
  order_items?: { product_name: string; quantity: number }[];
};

type ReferenceDashboardProps = {
  orders: Order[];
  products: Product[];
  customerCount: number;
  onOpenOrders: () => void;
  onOpenProducts: () => void;
};

const statusLabels: Record<string, string> = {
  new: "جديد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  refunded: "مسترجع",
};


const number = new Intl.NumberFormat("ar-SA");
const money = (value: number) => `${number.format(Math.round(value))} ر.س`;
const relative = (iso: string) => {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  if (days === 0) return "منذ أقل من يوم";
  if (days === 1) return "منذ يوم";
  if (days < 7) return `منذ ${number.format(days)} أيام`;
  const weeks = Math.floor(days / 7);
  return `منذ ${number.format(weeks)} ${weeks === 1 ? "أسبوع" : "أسابيع"}`;
};

export function ReferenceDashboard({ orders, products, customerCount, onOpenOrders, onOpenProducts }: ReferenceDashboardProps) {
  const now = new Date();
  const monthOrders = orders.filter((order) => {
    const date = new Date(order.created_at);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const validMonthOrders = monthOrders.filter((order) => !["cancelled", "refunded"].includes(order.status));
  const sales = validMonthOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const chart = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dailySales = monthOrders
      .filter((order) => new Date(order.created_at).getDate() === day && !["cancelled", "refunded"].includes(order.status))
      .reduce((sum, order) => sum + Number(order.total), 0);
    return { day: `${day}/${now.getMonth() + 1}`, tick: day % 6 === 1 ? `${day}/${now.getMonth() + 1}` : "", sales: dailySales };
  });
  const lowStock = products.filter((product) => product.stock <= product.low_stock_threshold);
  const alerts = orders.slice(0, 5);

  return (
    <div className="mx-auto grid w-full max-w-[1260px] items-start gap-4 xl:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className="overflow-hidden rounded-md border bg-card shadow-sm">
          <div className="flex h-12 items-center justify-between border-b px-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Bell className="size-4 text-muted-foreground" />التنبيهات</h2>
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{number.format(alerts.length)}</span>
          </div>
          <div className="max-h-[330px] overflow-y-auto">
            {alerts.map((order) => (
              <button type="button" key={order.id} onClick={onOpenOrders} className="grid w-full grid-cols-[32px_44px_minmax(0,1fr)] items-start gap-2 border-b px-3 py-3 text-right last:border-0 hover:bg-muted/40">
                <span className="grid size-8 place-items-center rounded-full bg-secondary text-primary"><ShoppingBag className="size-4" /></span>
                {(() => {
                  const first = order.order_items?.[0]?.product_name;
                  const image = products.find((product) => product.name_ar === first)?.product_images?.[0]?.image_url;
                  return image
                    ? <img src={image} alt="" className="size-11 rounded object-cover" />
                    : <span className="grid size-11 place-items-center rounded bg-muted text-muted-foreground"><Package className="size-5 stroke-1" /></span>;
                })()}
                <span className="min-w-0">
                  <b className="block text-[11px] leading-5">{order.customer_name} أضاف {order.order_items?.[0]?.product_name ?? "منتجاً"} للسلة</b>
                  <small className="mt-0.5 block text-[10px] text-muted-foreground">{relative(order.created_at)}</small>
                </span>
              </button>
            ))}
            {!alerts.length && <p className="p-8 text-center text-xs text-muted-foreground">لا توجد تنبيهات جديدة</p>}
          </div>
        </section>

        <section className="overflow-hidden rounded-md border bg-card shadow-sm">
          <div className="flex h-12 items-center gap-2 border-b px-4"><AlertTriangle className="size-4 text-muted-foreground" /><h2 className="text-sm font-semibold">منتجات نفدت</h2></div>
          <div className="min-h-48 px-4 py-3 text-center">
            {lowStock.length ? lowStock.slice(0, 5).map((product) => (
              <button type="button" key={product.id} onClick={onOpenProducts} className="flex w-full items-center justify-between gap-3 border-b py-3 text-right text-xs last:border-0 hover:text-primary">
                <b className="min-w-0 truncate">{product.name_ar}</b>
                <span className="shrink-0 text-destructive">{number.format(product.stock)} متبقي</span>
              </button>
            )) : (
              <div className="grid min-h-40 place-items-center">
                <div><Package className="mx-auto size-14 stroke-1 text-muted-foreground/30" /><p className="mt-3 text-xs text-muted-foreground">لا يوجد</p></div>
              </div>
            )}
          </div>
        </section>
      </aside>

      <div className="space-y-4">
        <section className="overflow-hidden rounded-md border bg-card shadow-sm">
          <div className="grid min-h-[286px] lg:grid-cols-[1fr_1.08fr]">
            <div className="order-2 p-5 lg:order-1">
              <div className="mb-7 flex items-start justify-between gap-4">
                <div><h1 className="text-base font-semibold">ملخص الشهر</h1><p className="mt-1 text-[10px] text-muted-foreground">آخر تحديث: منذ لحظات</p></div>
                <span className="text-[10px] text-muted-foreground" dir="ltr">{now.toLocaleDateString("ar", { month: "long", year: "numeric" })}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-7">
                <Summary icon={Users} label="الزيارات" value={customerCount ? number.format(customerCount) : "—"} hint />
                <Summary icon={WalletCards} label="المبيعات" value={sales ? new Intl.NumberFormat("en-US").format(Math.round(sales)) : "—"} hint />
                <Summary icon={CalendarDays} label="الطلبات" value={number.format(monthOrders.length)} />
                <Summary icon={Trophy} label="هدف الشهر" value="—" action={<button type="button" onClick={onOpenOrders} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary">هدف الشهر<ChevronLeft className="size-3" /></button>} />
              </div>
              <Button variant="ghost" size="sm" className="mt-6 gap-1 px-0 text-primary" onClick={onOpenOrders}>المزيد من التقارير<ChevronLeft className="size-3" /></Button>
            </div>
            <div className="order-1 p-3 lg:order-2">
              <div className="h-[250px] w-full rounded-md bg-accent/80 p-3 lg:h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 16, right: 6, left: 6, bottom: 0 }} barCategoryGap="22%">
                    <XAxis dataKey="tick" tickLine={false} axisLine={false} interval={0} fontSize={10} dy={4} reversed />
                    <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.day ?? ""} formatter={(value) => money(Number(value))} cursor={{ fill: "oklch(0 0 0 / .05)" }} />
                    <Bar dataKey="sales" fill="oklch(0.55 0.21 349)" radius={[1, 1, 0, 0]} maxBarSize={9} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-md border bg-card shadow-sm">
          <div className="flex h-12 items-center justify-between border-b px-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-muted-foreground" />أحدث الطلبات</h2>
          </div>
          <div>
            {orders.slice(0, 14).map((order) => (
              <button type="button" key={order.id} onClick={onOpenOrders} className="grid min-h-[64px] w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b px-5 py-2.5 text-right last:border-0 hover:bg-muted/40">
                <span className="grid size-8 place-items-center rounded-full bg-secondary text-primary"><UserRound className="size-4" /></span>
                <span className="min-w-0">
                  <b className="block truncate text-xs">{order.customer_name}</b>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-[9px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><i className="inline-block size-1.5 rounded-full bg-primary not-italic" />{statusLabels[order.status] ?? order.status}</span>
                    {order.shipping_address?.city && <span className="inline-flex items-center gap-0.5"><MapPin className="size-2.5" />{order.shipping_address.city}</span>}
                    <span dir="ltr">#{order.order_number}</span>
                  </span>
                </span>
                <span className="text-left"><b className="block whitespace-nowrap text-[11px] text-primary">{money(Number(order.total))}</b><small className="text-[9px] text-muted-foreground">{relative(order.created_at)}</small></span>
              </button>
            ))}
            {!orders.length && <p className="p-10 text-center text-sm text-muted-foreground">لا توجد طلبات بعد</p>}
          </div>
          <div className="border-t p-2 text-center"><Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={onOpenOrders}>المزيد من الطلبات<ChevronLeft className="size-3" /></Button></div>
        </section>
      </div>

      <button type="button" onClick={() => document.getElementById("support-widget-trigger")?.click()} className="fixed bottom-5 left-5 z-20 grid size-10 place-items-center rounded-full bg-accent text-primary shadow-md" title="المساعدة" aria-label="المساعدة"><CircleHelp className="size-5" /></button>
    </div>
  );
}

function Summary({ icon: Icon, label, value, hint, action }: { icon: typeof Users; label: string; value: string; hint?: boolean; action?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-full bg-accent text-primary"><Icon className="size-[17px]" /></span>
      <span className="min-w-0">
        <strong className="block truncate text-base text-primary">{value}</strong>
        {action ?? (
          <small className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {label}
            {hint && <CircleHelp className="size-3 opacity-60" />}
          </small>
        )}
      </span>
    </div>
  );
}