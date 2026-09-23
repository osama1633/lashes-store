// أخبار المتجر — أضيفي أي خبر جديد في أعلى القائمة ليظهر في قسم "الأخبار".
export type NewsItem = {
  id: string;
  title: string;
  body: string;
  date: string;
  badge?: string;
};

export const STORE_NEWS: NewsItem[] = [
  {
    id: "launch15",
    title: "كود LAUNCH15 — خصم ١٠٪",
    body: "استخدمي كود LAUNCH15 عند إتمام الطلب واحصلي على خصم ١٠٪ على جميع الباقات.",
    date: "هذا الأسبوع",
    badge: "جديد",
  },
  {
    id: "free-shipping",
    title: "شحن مجاني فوق ١٥٠ ر.س",
    body: "كل طلب قيمته ١٥٠ ريال أو أكثر يُشحن مجاناً داخل المملكة، مع إمكانية الدفع عند الاستلام.",
    date: "عرض مستمر",
  },
  {
    id: "bundles",
    title: "باقات التوفير متاحة الآن",
    body: "باقة عبوتين وباقة ٣ عبوات بأسعار مخفّضة — مناسبة للاستخدام اليومي وللإهداء.",
    date: "متوفر",
  },
];
