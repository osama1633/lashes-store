import { createServerFn } from "@tanstack/react-start";

const TABBY_API = "https://api.tabby.ai/api/v2";

const getKeys = () => ({
  publicKey: process.env["TABBY_PUBLIC_KEY"],
  secretKey: process.env["TABBY_SECRET_KEY"],
});

const toE164 = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("966")) return `+${digits}`;
  if (digits.startsWith("0")) return `+966${digits.slice(1)}`;
  if (digits.startsWith("5")) return `+966${digits}`;
  return `+${digits}`;
};

/** Creates a real Tabby checkout session for an existing order and returns its hosted URL. */
export const createTabbyCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: { orderNumber: string; origin: string }) => input)
  .handler(async ({ data }) => {
    const { publicKey } = getKeys();
    if (!publicKey) return { url: "", error: "not_configured" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id,order_number,customer_name,customer_phone,customer_email,shipping_address,subtotal,discount_amount,shipping_amount,tax_amount,total,order_items(product_name,sku,unit_price,quantity,line_total)")
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (!order) return { url: "", error: "order_not_found" as const };

    const address = (order.shipping_address ?? {}) as { city?: string; address?: string };
    const payload = {
      payment: {
        amount: Number(order.total).toFixed(2),
        currency: "SAR",
        description: `LASHES 1/2 — طلب ${order.order_number}`,
        buyer: {
          phone: toE164(order.customer_phone),
          email: order.customer_email || "orders@lashes20.com",
          name: order.customer_name,
        },
        shipping_address: {
          city: address.city ?? "",
          address: address.address ?? "",
          zip: "",
        },
        order: {
          reference_id: order.order_number,
          items: (order.order_items ?? []).map((item) => ({
            title: item.product_name,
            quantity: item.quantity,
            unit_price: Number(item.unit_price).toFixed(2),
            reference_id: item.sku,
            category: "beauty",
          })),
          shipping_amount: Number(order.shipping_amount).toFixed(2),
          tax_amount: Number(order.tax_amount).toFixed(2),
          discount_amount: Number(order.discount_amount).toFixed(2),
        },
        buyer_history: { registered_since: new Date().toISOString(), loyalty_level: 0 },
      },
      lang: "ar",
      merchant_urls: {
        success: `${data.origin}/?tabby=success&order=${order.order_number}`,
        cancel: `${data.origin}/?tabby=cancel&order=${order.order_number}`,
        failure: `${data.origin}/?tabby=failure&order=${order.order_number}`,
      },
    };

    const response = await fetch(`${TABBY_API}/checkout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${publicKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as
      | { status?: string; configuration?: { available_products?: { installments?: { web_url?: string }[] } } }
      | null;
    if (!response.ok || !body) {
      console.error("[Tabby] checkout failed", response.status);
      return { url: "", error: "request_failed" as const };
    }
    const url = body.configuration?.available_products?.installments?.[0]?.web_url ?? "";
    if (!url) return { url: "", error: "rejected" as const };
    return { url, error: null };
  });

async function settlePayment(paymentId: string, orderNumber: string) {
  const { secretKey } = getKeys();
  if (!secretKey) return { status: "not_configured" as const };

  const auth = { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" };
  const response = await fetch(`${TABBY_API}/payments/${paymentId}`, { headers: auth });
  const payment = (await response.json().catch(() => null)) as
    | { status?: string; amount?: string; order?: { reference_id?: string } }
    | null;
  if (!response.ok || !payment) return { status: "error" as const };

  const reference = payment.order?.reference_id ?? orderNumber;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (payment.status === "AUTHORIZED") {
    const capture = await fetch(`${TABBY_API}/payments/${paymentId}/captures`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ amount: payment.amount }),
    });
    if (!capture.ok) {
      console.error("[Tabby] capture failed", capture.status);
      return { status: "error" as const };
    }
  }

  if (payment.status === "AUTHORIZED" || payment.status === "CLOSED") {
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", status: "processing" })
      .eq("order_number", reference);
    return { status: "paid" as const };
  }

  if (payment.status === "REJECTED" || payment.status === "EXPIRED") {
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "failed", status: "cancelled" })
      .eq("order_number", reference);
    return { status: "failed" as const };
  }

  return { status: "pending" as const };
}

/** Verifies a Tabby payment server-side after the shopper returns, captures it and marks the order paid. */
export const confirmTabbyPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { paymentId: string; orderNumber: string }) => input)
  .handler(async ({ data }) => settlePayment(data.paymentId, data.orderNumber));

/** Marks an order as failed/cancelled when the shopper cancels or Tabby declines. */
export const cancelTabbyOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { orderNumber: string; reason: "cancel" | "failure" }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: data.reason === "failure" ? "failed" : "pending", status: "cancelled" })
      .eq("order_number", data.orderNumber)
      .eq("payment_status", "pending");
    return { ok: true };
  });

export const settleTabbyPaymentServer = settlePayment;
