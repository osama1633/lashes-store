import { useState } from "react";
import {
  BadgePercent,
  Banknote,
  BarChart3,
  CalendarDays,
  Gift,
  Megaphone,
  MousePointerClick,
  Search,
  ShoppingBag,
  TicketPercent,
  Users,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Tool = {
  title: string;
  description: string;
  icon: typeof Gift;
  destination?: "coupons" | "orders" | "reports" | "campaigns";
};

const groups: { title: string; tools: Tool[] }[] = [
  {
    title: "الخصومات",
    tools: [
      { title: "كوبونات التخفيض", description: "إنشاء أكواد وخصومات متنوعة", icon: TicketPercent, destination: "coupons" },
      { title: "العروض الخاصة", description: "تفعيل وإدارة العروض وتخصيصها", icon: BadgePercent },
      { title: "عروض السلة", description: "تطبيق عروض في السلة بشروط محددة", icon: ShoppingBag },
      { title: "عروض الكاش باك", description: "إنشاء عروض كاش باك للعملاء", icon: Banknote },
    ],
  },
  {
    title: "الحملات",
    tools: [
      { title: "السلات المتروكة", description: "إرسال تذكير للعملاء لإتمام الشراء", icon: ShoppingBag, destination: "orders" },
      { title: "الحملات التسويقية", description: "تسويق عبر الرسائل النصية والإشعارات", icon: Megaphone, destination: "campaigns" },
      { title: "التسويق بالعمولة", description: "إنشاء رابط أو كوبون تسويقي", icon: WalletCards },
      { title: "مدير الأحداث", description: "أحداث سلة البيكسل والتحويلات", icon: BarChart3, destination: "reports" },
    ],
  },
  {
    title: "التسويق بالمحتوى",
    tools: [
      { title: "الإعلانات", description: "عرض سريع لنتائج حملات المتجر", icon: Megaphone, destination: "reports" },
      { title: "المدونة", description: "نشر مقالات عن منتجاتك وحملاتك", icon: MousePointerClick, destination: "reports" },
      { title: "تحسين محركات البحث", description: "زيادة عدد زيارات محركات البحث", icon: Search, destination: "reports" },
    ],
  },
  {
    title: "الأدوات المتقدمة",
    tools: [
      { title: "ولاء العملاء", description: "اكسب العملاء عبر نقاط ولاء ومكافآت", icon: Users },
      { title: "نظام الإهداء", description: "قدّم لعملائك خيار إرسال مشترياتهم كهدية", icon: Gift },
      { title: "الطلب المباشر", description: "اختصار خطوات إتمام الطلب على العميل", icon: MousePointerClick },
      { title: "جدولة التسويق", description: "معاينة العروض المجدولة", icon: CalendarDays },
    ],
  },
];

export function MarketingToolsPage({ onNavigate }: { onNavigate: (section: "coupons" | "orders" | "reports" | "campaigns") => void }) {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [saved, setSaved] = useState(false);

  const openTool = (tool: Tool) => {
    if (tool.destination) {
      onNavigate(tool.destination);
      return;
    }
    setSaved(false);
    setActiveTool(tool);
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>الرئيسية / الأدوات التسويقية</span>
        <span className="inline-flex items-center gap-2"><Megaphone className="size-4" /> إعدادات التسويق</span>
      </div>

      <section className="flex min-h-32 flex-col justify-center rounded-md border bg-card px-7 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <h1 className="text-xl font-extrabold">حلول تسويقية أقوى في مكان واحد</h1>
            <p className="mt-2 text-sm text-muted-foreground">أنشئ حملاتك بسرعة، واكتشف الأدوات التي تساعدك على زيادة المبيعات.</p>
          </div>
          <Button className="gap-2 px-6" onClick={() => onNavigate("reports")}>تقارير التسويق <span aria-hidden>‹</span></Button>
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="text-base font-bold text-muted-foreground">{group.title}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {group.tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.title}
                  type="button"
                  variant="outline"
                  onClick={() => openTool(tool)}
                  className="h-28 justify-start whitespace-normal bg-card px-6 text-right shadow-none hover:border-primary/50 hover:bg-primary/5"
                >
                  <Icon className="size-8 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <b className="block text-sm text-foreground">{tool.title}</b>
                    <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">{tool.description}</span>
                  </span>
                </Button>
              );
            })}
          </div>
        </section>
      ))}

      <Dialog open={Boolean(activeTool)} onOpenChange={(open) => !open && setActiveTool(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{activeTool?.title}</DialogTitle></DialogHeader>
          {saved ? (
            <div className="py-10 text-center"><p className="font-bold text-primary">تم حفظ الإعداد بنجاح</p><Button className="mt-5" onClick={() => setActiveTool(null)}>إغلاق</Button></div>
          ) : (
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setSaved(true); }}>
              <label className="block space-y-2 text-sm"><span>اسم الحملة</span><Input required placeholder={activeTool?.title} /></label>
              <label className="block space-y-2 text-sm"><span>تفاصيل الحملة</span><Textarea required placeholder="اكتب تفاصيل العرض أو الرسالة التسويقية" /></label>
              <label className="block space-y-2 text-sm"><span>تاريخ البدء</span><Input type="date" required /></label>
              <Button type="submit" className="w-full">حفظ وتفعيل</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}