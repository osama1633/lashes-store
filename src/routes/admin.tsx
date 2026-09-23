import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Mail, Lock } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { prepareStaffOtp, toE164 } from "@/lib/staff-auth.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "لوحة إدارة LASHES 1/2" },
    { name: "description", content: "لوحة إدارة متجر LASHES 1/2 الآمنة" },
    { property: "og:title", content: "لوحة إدارة LASHES 1/2" },
    { property: "og:description", content: "إدارة المنتجات والطلبات والعملاء" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminRoute,
});

function AdminRoute() {
  const [state, setState] = useState<"loading"|"signedOut"|"forbidden"|"admin">("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const check = async () => {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) { setState("signedOut"); setUser(null); return; }
    setUser(data.user);
    const roleCheck = async (role: "admin" | "staff") => (await supabase.rpc("has_role", { _user_id: data.user!.id, _role: role })).data === true;
    const anyRole = async () => (await roleCheck("admin")) || (await roleCheck("staff"));
    let allowed = await anyRole();
    if (!allowed && data.user.phone) {
      const { data: claimedStaff } = await supabase.rpc("claim_staff_access");
      if (claimedStaff) allowed = await anyRole();
    }
    if (!allowed && ["abdulazizrashudi@gmail.com","dody505060607070@gmail.com","of94086@gmail.com"].includes(data.user.email?.toLowerCase() ?? "")) {
      const { data: claimed, error: claimError } = await supabase.rpc("claim_store_admin");
      if (claimed && !claimError) allowed = await anyRole();
    }
    sessionStorage.removeItem("lash-admin-return");
    setState(allowed ? "admin" : "forbidden");
  };
  useEffect(() => { void check(); const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN" || event === "SIGNED_OUT") window.setTimeout(() => void check(), 0); }); return () => data.subscription.unsubscribe(); }, []);
  const signIn = async () => { setError(""); sessionStorage.setItem("lash-admin-return", "/admin"); const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin, extraParams: { prompt: "select_account", login_hint: "abdulazizrashudi@gmail.com" } }); if (result.error) setError(result.error.message); if (!result.redirected) await check(); };
  const signOut = async () => { sessionStorage.removeItem("lash-admin-return"); await supabase.auth.signOut(); setUser(null); window.location.assign("/"); };
  if (state === "loading") return <main dir="rtl" className="grid min-h-screen place-items-center bg-admin-bg"><p>جارٍ التحقق من صلاحية الدخول...</p></main>;
  if (state === "admin") return <AdminDashboard onSignOut={signOut} userEmail={user?.email ?? ""}/>;
  return <AdminLogin state={state} email={user?.email ?? ""} error={error} onGoogle={()=>void signIn()} onSwitchAccount={()=>void signOut()} onDone={()=>void check()} onError={setError}/>;
}

function AdminLogin({ state, email, error, onGoogle, onSwitchAccount, onDone, onError }: { state: "signedOut"|"forbidden"; email: string; error: string; onGoogle: () => void; onSwitchAccount: () => void; onDone: () => void; onError: (m: string) => void }) {
  const [mode, setMode] = useState<"signin"|"signup">("signin");
  const [mail, setMail] = useState("abdulazizrashudi@gmail.com");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const normalizedMail = mail.trim().toLowerCase();
  const isGoogleAdmin = normalizedMail === "abdulazizrashudi@gmail.com";
  const resetPassword = async () => {
    onError(""); setMessage("");
    if (!mail.trim()) { onError("أدخل البريد الإلكتروني أولاً."); return; }
    setBusy(true);
    sessionStorage.setItem("lash-password-return", "/admin");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(mail.trim().toLowerCase(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (resetError) { onError("تعذر إرسال رابط إنشاء كلمة المرور. حاول مرة أخرى."); return; }
    setMessage("أرسلنا رابط إنشاء كلمة المرور إلى بريدك الإلكتروني.");
  };
  const submit = async () => {
    onError(""); setMessage("");
    if (mode === "signin" && isGoogleAdmin) {
      onGoogle();
      return;
    }
    if (!mail.trim() || password.length < 6) { onError("أدخل بريداً إلكترونياً صحيحاً وكلمة مرور من 6 أحرف على الأقل."); return; }
    setBusy(true);
    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email: mail.trim(), password });
      if (err) {
        const isGoogleOnlyAdmin = ["abdulazizrashudi@gmail.com","dody505060607070@gmail.com","of94086@gmail.com"].includes(mail.trim().toLowerCase());
        onError(isGoogleOnlyAdmin ? "هذا الحساب مسجل عبر Google. اضغط «الدخول بحساب Google» أو استخدم «نسيت كلمة المرور؟» لإنشاء كلمة مرور." : "بيانات الدخول غير صحيحة، تأكد من البريد وكلمة المرور.");
        setBusy(false); return;
      }
      onDone();
    } else {
      const { data: up, error: err } = await supabase.auth.signUp({ email: mail.trim(), password, options: { emailRedirectTo: window.location.origin } });
      if (err) { onError(err.message); setBusy(false); return; }
      if (!up.session) await supabase.auth.signInWithPassword({ email: mail.trim(), password });
      setMessage("تم إنشاء الحساب.");
      onDone();
    }
    setBusy(false);
  };
  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-admin-bg px-4 py-10">
      <section className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-primary/10 text-primary"><ShieldCheck className="size-8"/></div>
        <p className="mb-1 text-xs font-semibold text-primary">LASHES 1/2</p>
        <h1 className="text-2xl font-bold">دخول إدارة المتجر</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">هذه المنطقة مخصصة لإدارة المتجر فقط.</p>
        {state === "forbidden" && <div className="mt-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive">الحساب {email} لا يملك صلاحية الإدارة.</div>}
        <div className="mt-6 grid grid-cols-2 rounded-full bg-muted p-1 text-sm font-semibold">
          <button type="button" className={`rounded-full py-2 transition ${mode==="signin"?"bg-primary text-primary-foreground shadow":""}`} onClick={()=>{setMode("signin"); onError(""); setMessage("");}}>تسجيل الدخول</button>
          <button type="button" className={`rounded-full py-2 transition ${mode==="signup"?"bg-primary text-primary-foreground shadow":""}`} onClick={()=>{setMode("signup"); onError(""); setMessage("");}}>إنشاء حساب</button>
        </div>
        <form className="mt-5 space-y-3 text-right" onSubmit={(e)=>{e.preventDefault(); void submit();}}>
          <div className="relative"><Mail className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input dir="ltr" type="email" required value={mail} onChange={(e)=>setMail(e.target.value)} placeholder="admin@email.com" className="h-11 w-full rounded-md border bg-background pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/40"/></div>
          <div className="relative"><Lock className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input dir="ltr" type="password" required={!isGoogleAdmin || mode === "signup"} minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder={isGoogleAdmin && mode === "signin" ? "الدخول لهذا الحساب يتم عبر Google" : "••••••••"} disabled={isGoogleAdmin && mode === "signin"} className="h-11 w-full rounded-md border bg-background pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"/></div>
          {mode === "signin" && <Button type="button" variant="link" className="h-auto px-0 text-primary" disabled={busy} onClick={()=>void resetPassword()}>نسيت كلمة المرور؟</Button>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          <Button type="submit" disabled={busy} className="h-12 w-full">{busy?"جارٍ التنفيذ...":mode==="signin"?(isGoogleAdmin?"الدخول إلى لوحة الإدارة عبر Google":"متابعة"):"إنشاء الحساب"}</Button>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>أو من خلال<span className="h-px flex-1 bg-border"/></div>
        {!isGoogleAdmin && <Button variant="outline" className="h-12 w-full" onClick={onGoogle}><GoogleIcon/>الدخول بحساب Google</Button>}
        {state === "forbidden" && <Button className="mt-2 w-full" variant="ghost" onClick={onSwitchAccount}>استخدام حساب آخر</Button>}
        <StaffPhoneLogin onDone={onDone} />
        <a href="/" className="mt-5 block text-sm text-muted-foreground hover:text-foreground">العودة إلى المتجر</a>
      </section>
    </main>
  );
}
function GoogleIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 12.2c0-.64-.06-1.25-.17-1.84H12v3.48h5.25a4.49 4.49 0 0 1-1.95 2.94v2.26h3.16c1.85-1.7 2.89-4.21 2.89-6.84Z"/><path fill="currentColor" opacity=".75" d="M12 21.72c2.64 0 4.86-.88 6.48-2.38l-3.16-2.45c-.88.59-2 .94-3.32.94-2.55 0-4.7-1.72-5.48-4.03H3.25v2.54A9.8 9.8 0 0 0 12 21.72Z"/></svg>}

function StaffPhoneLogin({ onDone }: { onDone: () => void }) {
  const [country, setCountry] = useState<"SA" | "EG">("SA");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(0);
  useEffect(() => { if (!wait) return; const id = window.setInterval(() => setWait((w) => (w > 0 ? w - 1 : 0)), 1000); return () => window.clearInterval(id); }, [wait]);

  const send = async () => {
    setErr(""); setMsg("");
    const e164 = toE164(country, phone);
    if (!e164) { setErr(country === "SA" ? "رقم سعودي غير صحيح، مثال: 0501234567" : "رقم مصري غير صحيح، مثال: 01012345678"); return; }
    setBusy(true);
    try {
      const prepared = await prepareStaffOtp({ data: { phone: e164 } });
      if (!prepared.ok) { setErr(prepared.reason === "not_allowed" ? "هذا الرقم غير مسجل لدى إدارة المتجر." : "تعذر إرسال رمز التحقق، حاول مرة أخرى."); setBusy(false); return; }
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (error) { setErr("تعذر إرسال رسالة التحقق. تأكد من تفعيل الرسائل النصية."); setBusy(false); return; }
      setStep("code"); setWait(60); setMsg("أرسلنا رمز التحقق إلى جوالك.");
    } catch { setErr("تعذر إرسال رمز التحقق، حاول مرة أخرى."); }
    setBusy(false);
  };
  const verify = async () => {
    setErr(""); setMsg("");
    const e164 = toE164(country, phone);
    if (!e164 || code.replace(/\D/g, "").length !== 6) { setErr("أدخل رمز التحقق المكوّن من 6 أرقام."); return; }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone: e164, token: code.replace(/\D/g, ""), type: "sms" });
    if (error) { setErr("رمز التحقق غير صحيح أو انتهت صلاحيته."); setBusy(false); return; }
    await supabase.rpc("claim_staff_access");
    setBusy(false);
    onDone();
  };

  return <div className="mt-5 rounded-lg border bg-muted/30 p-4 text-right">
    <p className="text-sm font-bold">دخول الموظفين برقم الجوال</p>
    <p className="mt-1 text-xs text-muted-foreground">الأرقام المسجلة من الإدارة فقط تستطيع الدخول.</p>
    {step === "phone" ? <div className="mt-3 space-y-2">
      <div className="flex gap-2">
        <select value={country} onChange={(e) => setCountry(e.target.value as "SA" | "EG")} className="h-11 w-28 rounded-md border bg-background px-2 text-sm outline-none"><option value="SA">🇸🇦 +966</option><option value="EG">🇪🇬 +20</option></select>
        <input dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={country === "SA" ? "0501234567" : "01012345678"} className="h-11 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
      </div>
      <Button className="h-11 w-full" disabled={busy} onClick={() => void send()}>{busy ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}</Button>
    </div> : <div className="mt-3 space-y-2">
      <input dir="ltr" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" className="h-11 w-full rounded-md border bg-background px-3 text-center text-lg tracking-[0.5em] outline-none focus:ring-2 focus:ring-primary/40" />
      <Button className="h-11 w-full" disabled={busy} onClick={() => void verify()}>{busy ? "جارٍ التحقق..." : "تأكيد الدخول"}</Button>
      <div className="flex items-center justify-between text-xs">
        <button type="button" className="text-primary disabled:opacity-50" disabled={busy || wait > 0} onClick={() => void send()}>{wait > 0 ? `إعادة الإرسال بعد ${wait} ثانية` : "إعادة إرسال الرمز"}</button>
        <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => { setStep("phone"); setCode(""); setErr(""); setMsg(""); }}>تغيير الرقم</button>
      </div>
    </div>}
    {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    {msg && <p className="mt-2 text-sm text-emerald-600">{msg}</p>}
  </div>;
}