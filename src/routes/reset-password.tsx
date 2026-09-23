import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "إعادة تعيين كلمة المرور | LASHES ½" },
      { name: "description", content: "أعيدي تعيين كلمة المرور لحسابك في متجر LASHES ½" },
      { property: "og:title", content: "إعادة تعيين كلمة المرور | LASHES ½" },
      { property: "og:description", content: "تعيين كلمة مرور جديدة وآمنة لحساب LASHES ½" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    const hashRecovery = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";
    if (hashRecovery) setRecoveryReady(true);
    void supabase.auth.getSession().then(({ data }) => { if (data.session) setRecoveryReady(true); });
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setRecoveryReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين"); return; }
    if (!recoveryReady) { setError("رابط الاستعادة غير صالح أو انتهت مدته. اطلبي رابطاً جديداً من صفحة الدخول."); return; }
    setError(""); setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) { setError("تعذّر تحديث كلمة المرور، اطلبي رابطاً جديداً وحاولي مجدداً"); return; }
    setDone(true);
    const destination = sessionStorage.getItem("lash-password-return") === "/admin" ? "/admin" : "/";
    sessionStorage.removeItem("lash-password-return");
    window.setTimeout(() => { if (destination === "/admin") window.location.assign("/admin"); else void navigate({ to: "/" }); }, 1800);
  };

  return <main dir="rtl" className="store grid min-h-svh place-items-center bg-secondary/40 px-4 py-10">
    <div className="w-full max-w-md rounded-xl bg-card px-8 py-10 text-center shadow-sm">
      <div className="mx-auto grid size-16 place-items-center rounded-full border"><Lock className="size-7 text-muted-foreground" strokeWidth={1.5} /></div>
      <h1 className="font-editorial mt-4 text-2xl font-bold">إعادة تعيين كلمة المرور</h1>
      {done ? <p className="mt-4 text-sm text-primary">تم تحديث كلمة المرور بنجاح، جارٍ تحويلك للمتجر…</p> : <>
        <div className="mt-6 space-y-4 text-right">
          <div className="space-y-2">
            <label className="text-sm font-bold" htmlFor="new-password">كلمة المرور الجديدة</label>
            <Input id="new-password" type="password" dir="ltr" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 text-left" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold" htmlFor="confirm-password">تأكيد كلمة المرور</label>
            <Input id="confirm-password" type="password" dir="ltr" placeholder="••••••••" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="h-12 text-left" />
          </div>
        </div>
        <Button className="store-cta mt-5 h-12 w-full text-base" disabled={busy || !recoveryReady} onClick={() => void submit()}>حفظ كلمة المرور</Button>
        {!recoveryReady && <p className="mt-3 text-xs text-muted-foreground">افتحي رابط الاستعادة المرسل إلى بريدك لإكمال العملية.</p>}
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </>}
    </div>
  </main>;
}
