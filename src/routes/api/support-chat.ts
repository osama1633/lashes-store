import { createFileRoute } from "@tanstack/react-router";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `أنت "مساعد LASHES ½" للدعم الفني وخدمة العميلات في متجر سعودي لمسكرة الرموش LASHES ½.
- أجيبي دائماً بالعربية الفصحى المبسّطة وبنبرة ودودة ومحترمة، وبإجابات قصيرة واضحة.
- ساعدي العميلة في: معلومات المنتج والباقات، الأسعار بالريال السعودي، الشحن والتوصيل (٢-٤ أيام عمل داخل المملكة)، الاستبدال والاسترجاع خلال ٧ أيام، طريقة الاستخدام، إنشاء الحساب وتسجيل الدخول، مشاكل السلة والدفع، وأي خطأ يظهر في الموقع.
- إذا واجهت العميلة خطأ في الموقع، اطلبي وصفاً قصيراً وخطوات واضحة للحل (تحديث الصفحة، إعادة تسجيل الدخول، تفريغ السلة...)، ثم اقترحي التواصل عبر واتساب 966502203636 إذا استمر الخطأ.
- لا تختلقي أرقام طلبات أو أسعار غير معروفة؛ وإن لم تعرفي شيئاً قولي ذلك واقترحي واتساب.`;

export const Route = createFileRoute("/api/support-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: Msg[] };
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("messages required", { status: 400 });
        }
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions: SYSTEM,
            input: messages.slice(-20).map((m) => ({
              role: m.role,
              content: [
                { type: m.role === "assistant" ? "output_text" : "input_text", text: m.content },
              ],
            })),
            stream: true,
            store: false,
            reasoning: { effort: "low", summary: "auto" },
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const body = await upstream.text();
          console.error(`support-chat gateway failed [${upstream.status}]: ${body}`);
          return new Response(body || "AI request failed", { status: upstream.status || 500 });
        }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        const reader = upstream.body.getReader();
        let buffer = "";

        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
                return;
              }
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              let out = "";
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const raw = line.slice(5).trim();
                if (!raw || raw === "[DONE]") continue;
                try {
                  const event = JSON.parse(raw) as { type?: string; delta?: string };
                  if (event.type === "response.output_text.delta" && event.delta) out += event.delta;
                } catch {
                  /* ignore partial frames */
                }
              }
              if (out) {
                controller.enqueue(encoder.encode(out));
                return;
              }
            }
          },
          cancel(reason) {
            return reader.cancel(reason);
          },
        });

        return new Response(stream, {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});
