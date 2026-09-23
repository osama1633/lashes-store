export const sectionNames: Record<string, string> = {
  home: "البانر الرئيسي", bundles: "الباقات", usage: "طريقة الاستخدام", featured: "تفاصيل المسكرة",
  why: "لماذا LASHES", reviews: "آراء العميلات", services: "مزايا الخدمة", faq: "الأسئلة الشائعة",
};

export const initialOrder = Object.keys(sectionNames);

export const editableFields: { section: string; key: string; label: string; defaultValue: string; kind?: "image" | "long" }[] = [
  { section: "home", key: "heroTitle", label: "العنوان الرئيسي", defaultValue: "نظرة تأسر من أول رمشة" },
  { section: "home", key: "heroDescription", label: "وصف البانر", defaultValue: "مسكرة سيروم لتطويل وتكثيف الرموش والحواجب، بتركيبة خفيفة وثبات يدوم طوال اليوم.", kind: "long" },
  { section: "home", key: "heroImage", label: "صورة البانر", defaultValue: "", kind: "image" },
  { section: "bundles", key: "bundlesTitle", label: "عنوان الباقات", defaultValue: "اختاري باقتك" },
  { section: "bundles", key: "bundlesSubtitle", label: "وصف الباقات", defaultValue: "شحن سريع · دفع عند الاستلام · ضمان الجودة" },
  { section: "usage", key: "usageTitle", label: "عنوان طريقة الاستخدام", defaultValue: "طريقة الاستخدام" },
  { section: "usage", key: "usageSubtitle", label: "وصف طريقة الاستخدام", defaultValue: "ثلاث خطوات لرموش آسرة" },
  { section: "usage", key: "usageStep1", label: "عنوان الخطوة الأولى", defaultValue: "نظّفي الرموش" },
  { section: "usage", key: "usageStep2", label: "عنوان الخطوة الثانية", defaultValue: "طبّقي من الجذور" },
  { section: "usage", key: "usageStep3", label: "عنوان الخطوة الثالثة", defaultValue: "كرّري للكثافة" },
  { section: "featured", key: "featuredTitle", label: "عنوان المنتج", defaultValue: "ماسكرا سيروم لتطويل وتكثيف الرموش والحواجب" },
  { section: "featured", key: "featuredDescription", label: "وصف المنتج", defaultValue: "ماسكارا مغذّية بالكحل تمنح رموشك طولاً وكثافة من أول لمسة، مع فرشاة دقيقة تصل لكل رمشة. تركيبة خفيفة لا تتكتّل، تدوم طول اليوم، وسهلة الإزالة.", kind: "long" },
  { section: "featured", key: "featuredImage", label: "صورة المنتج", defaultValue: "", kind: "image" },
  { section: "why", key: "whyTitle", label: "عنوان المزايا", defaultValue: "لماذا مسكرة LASHES ½ ؟" },
  { section: "why", key: "whyImage", label: "صورة المزايا", defaultValue: "", kind: "image" },
  { section: "why", key: "whyPoint1", label: "الميزة الأولى", defaultValue: "كثافة فورية" },
  { section: "why", key: "whyPoint2", label: "الميزة الثانية", defaultValue: "ثبات يدوم" },
  { section: "why", key: "whyPoint3", label: "الميزة الثالثة", defaultValue: "لا تتكتل ولا تتساقط" },
  { section: "why", key: "whyPoint4", label: "الميزة الرابعة", defaultValue: "سهلة الإزالة" },
  { section: "reviews", key: "reviewsTitle", label: "عنوان آراء العميلات", defaultValue: "عميلاتنا يحبّوننا" },
  { section: "faq", key: "faqTitle", label: "عنوان الأسئلة", defaultValue: "كل ما تودّين معرفته عن LASHES ½" },
  { section: "faq", key: "faqQuestion1", label: "السؤال الأول", defaultValue: "هل المسكرة مناسبة للعيون الحساسة؟" },
  { section: "faq", key: "faqAnswer1", label: "الإجابة الأولى", defaultValue: "نعم، تركيبتها خالية من القسوة ومناسبة لمن يلبسون العدسات اللاصقة.", kind: "long" },
  { section: "faq", key: "faqQuestion2", label: "السؤال الثاني", defaultValue: "كم تستمر مدة التوصيل؟" },
  { section: "faq", key: "faqAnswer2", label: "الإجابة الثانية", defaultValue: "يتم الشحن عبر سمسا أو أرامكس، ويصل الطلب خلال ٢-٤ أيام عمل داخل المملكة.", kind: "long" },
  { section: "faq", key: "faqQuestion3", label: "السؤال الثالث", defaultValue: "ما سياسة الاستبدال والاسترجاع؟" },
  { section: "faq", key: "faqAnswer3", label: "الإجابة الثالثة", defaultValue: "يمكن استرجاع المنتج غير المستخدم خلال ٧ أيام من تاريخ الاستلام.", kind: "long" },
];

export type SiteContent = { order?: string[]; hidden?: string[]; fields?: Record<string, string>; prices?: Record<string, { regular_price: string; sale_price: string }> };

export function normalizeSiteContent(value: unknown): SiteContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const incomingOrder = input["order"];
  const incomingHidden = input["hidden"];
  const incomingFields = input["fields"];
  const incomingPrices = input["prices"];
  const ordered = Array.isArray(incomingOrder) ? incomingOrder.filter((id): id is string => typeof id === "string" && id in sectionNames) : [];
  return {
    order: [...new Set(ordered), ...initialOrder.filter(id => !ordered.includes(id))],
    hidden: Array.isArray(incomingHidden) ? incomingHidden.filter((id): id is string => typeof id === "string" && id in sectionNames) : [],
    fields: incomingFields && typeof incomingFields === "object" && !Array.isArray(incomingFields)
      ? Object.fromEntries(Object.entries(incomingFields).filter(([key, val]) => (editableFields.some(field => field.key === key) || /^productImage\.[0-9a-f-]{36}$/.test(key)) && typeof val === "string" && val.length < 5000)) as Record<string, string> : {},
    prices: incomingPrices && typeof incomingPrices === "object" && !Array.isArray(incomingPrices)
      ? Object.fromEntries(Object.entries(incomingPrices).filter(([, val]) => val && typeof val === "object" && typeof (val as { regular_price?: unknown }).regular_price === "string" && typeof (val as { sale_price?: unknown }).sale_price === "string")) as Record<string, { regular_price: string; sale_price: string }> : {},
  };
}