import { createFileRoute } from "@tanstack/react-router";
import { settleTabbyPaymentServer } from "@/lib/tabby.functions";

/**
 * Tabby webhook. The payload is never trusted: the payment is re-fetched from
 * Tabby with the secret key before any order is marked paid.
 */
export const Route = createFileRoute("/api/public/tabby-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = (await request.json().catch(() => null)) as
          | { id?: string; order?: { reference_id?: string } }
          | null;
        const paymentId = payload?.id;
        if (!paymentId) return new Response("bad request", { status: 400 });

        const result = await settleTabbyPaymentServer(paymentId, payload?.order?.reference_id ?? "");
        return Response.json({ ok: true, status: result.status });
      },
    },
  },
});
