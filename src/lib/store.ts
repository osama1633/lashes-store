import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  name_ar: string;
  name_en?: string | null;
  slug: string;
  description_ar: string;
  description_en?: string | null;
  regular_price: number;
  sale_price: number | null;
  stock: number;
  low_stock_threshold: number;
  sku: string;
  is_active: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  category_id: string | null;
  specifications: unknown;
  product_images?: { image_url: string; alt_text: string | null }[];
};

export async function fetchProducts(includeInactive = false) {
  let query = supabase.from("products").select("*, product_images(image_url,alt_text)").order("created_at", { ascending: false });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  const products = data as Product[];
  const paths = products.flatMap((product) => (product.product_images ?? []).filter((image) => image.image_url.startsWith("storage:")).map((image) => image.image_url.slice(8)));
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("product-images").createSignedUrls(paths, 3600);
    const urlMap = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
    for (const product of products) for (const image of product.product_images ?? []) if (image.image_url.startsWith("storage:")) image.image_url = urlMap.get(image.image_url.slice(8)) ?? image.image_url;
  }
  return products;
}

export const sar = (value: number) =>
  new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(value);

export const orderStatus: Record<string, string> = {
  new: "جديد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  refunded: "مسترجع",
};