import { createServerFn } from "@tanstack/react-start";

/** Normalizes a Saudi/Egyptian mobile number to E.164 (+966… / +20…). */
export function toE164(country: "SA" | "EG", raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (country === "SA") {
    if (digits.startsWith("966")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
    if (!/^5\d{8}$/.test(digits)) return null;
    return `+966${digits}`;
  }
  if (digits.startsWith("20")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^1\d{9}$/.test(digits)) return null;
  return `+20${digits}`;
}

/**
 * Checks the phone against the staff allowlist and makes sure a matching auth
 * user exists so the OTP can be delivered. Never creates accounts for numbers
 * that an admin has not added to the allowlist.
 */
export const prepareStaffOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string }) => {
    if (!/^\+(966|20)\d{9,10}$/.test(input.phone)) throw new Error("invalid_phone");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const digits = data.phone.replace(/\D/g, "");

    const { data: rows, error } = await supabaseAdmin
      .from("staff_phones")
      .select("phone, is_active")
      .eq("is_active", true);
    if (error) return { ok: false as const, reason: "server" as const };

    const allowed = (rows ?? []).some((row) => row.phone.replace(/\D/g, "") === digits);
    if (!allowed) return { ok: false as const, reason: "not_allowed" as const };

    const created = await supabaseAdmin.auth.admin.createUser({
      phone: data.phone,
      phone_confirm: true,
    });
    if (created.error && !/already/i.test(created.error.message)) {
      return { ok: false as const, reason: "server" as const };
    }
    return { ok: true as const };
  });
