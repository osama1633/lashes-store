import { createServerFn } from "@tanstack/react-start";

type Input = {
  phone: string;
  orderNumber: string;
  customerName: string;
  total: number;
};

const toSaudiE164 = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("0")) return `966${digits.slice(1)}`;
  if (digits.startsWith("5")) return `966${digits}`;
  return digits;
};

/**
 * Sends an order-confirmation message through Evolution API (WhatsApp).
 * Configure: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE.
 */
export const sendOrderConfirmation = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => input)
  .handler(async ({ data }) => {
    const base = process.env["EVOLUTION_API_URL"];
    const key = process.env["EVOLUTION_API_KEY"];
    const instance = process.env["EVOLUTION_INSTANCE"];
    if (!base || !key || !instance) return { sent: false, reason: "not_configured" };

    const number = toSaudiE164(data.phone);
    const text = [
      `مرحباً ${data.customerName} 💖`,
      "",
      `تم استلام طلبك رقم ${data.orderNumber} وتأكيده بنجاح.`,
      `الإجمالي: ${data.total} ر.س`,
      "",
      "سنبدأ بتجهيز طلبك وسنوافيك بتفاصيل الشحن قريباً.",
      "متجر LASHES 1/2",
    ].join("\n");

    try {
      const response = await fetch(
        `${base.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(instance)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: key },
          body: JSON.stringify({ number, text }),
        },
      );
      if (!response.ok) {
        const body = await response.text();
        console.error(`Evolution API failed [${response.status}]: ${body}`);
        return { sent: false, reason: `http_${response.status}` };
      }
      return { sent: true };
    } catch (error) {
      console.error("Evolution API request error", error);
      return { sent: false, reason: "request_failed" };
    }
  });
