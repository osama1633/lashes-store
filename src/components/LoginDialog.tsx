import { useState } from "react";
import { Lock, Mail, Phone, UserRound } from "lucide-react";
import { toE164 } from "@/lib/staff-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

function GoogleIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.8l7.8 6.1C12.3 13.9 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.2-3.2-.5-4.7H24v9.1h12.6c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7.1-10.2 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.1c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.8-6.1C1 16.1 0 19.9 0 23.5s1 7.4 2.6 10.7l7.8-6.1z"/><path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.4-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.8 2.3-6.4 0-11.7-4.3-13.6-10.2l-7.8 6.1C6.5 42.1 14.6 47.5 24 47.5z"/></svg>;
}

function AppleIcon() {
  return <svg viewBox="0 0 384 512" aria-hidden="true" className="size-5"><path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-36.8-2.8-77 21.3-91.7 21.3-15.5 0-51.1-20.3-79.1-20.3C61.2 141.6 8 184.4 8 271.3c0 25.7 4.7 52.3 14.1 79.7 12.6 36 58 122 105.4 120.5 24.8-.6 42.3-17.6 74.5-17.6 31.3 0 47.6 17.6 75.3 17.6 47.8-.7 89-78.9 101-115-64-30.2-59.6-86.9-59.6-87.8zM255.9 92.3c17.3-20.5 26.4-45.1 24-70.3-24.4 1.5-52.6 16.5-68.6 35.9-14.4 17.3-26.2 43.3-23.4 68.4 27.2 2.1 51.9-12.9 68-34z"/></svg>;
}

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5"><path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>;
}

type Mode = "signin" | "signup";

export function LoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [method, setMethod] = useState<"email" | "phone">("phone");
  const [country, setCountry] = useState<"SA" | "EG">("SA");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const switchMode = (next: Mode) => { setMode(next); setError(""); setMessage(""); };

  const sendCode = async () => {
    const e164 = toE164(country, phone);
    if (!e164) { setError("أدخلي رقم جوال صحيح"); return; }
    setError(""); setMessage(""); setBusy(true);
    sessionStorage.setItem("lash-intent-signin", "1");
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);
    if (otpError) { setError("تعذّر إرسال رمز التحقق، حاولي بعد قليل"); return; }
    setCodeSent(true);
    setMessage("أرسلنا رمز تحقق من ٦ أرقام إلى جوالك");
  };

  const verifyCode = async () => {
    const e164 = toE164(country, phone);
    const token = code.replace(/\D/g, "");
    if (!e164 || token.length !== 6) { setError("أدخلي رمز التحقق المكوّن من ٦ أرقام"); return; }
    setError(""); setMessage(""); setBusy(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({ phone: e164, token, type: "sms" });
    setBusy(false);
    if (verifyError) { setError("رمز التحقق غير صحيح أو منتهي الصلاحية"); return; }
    setCode(""); setCodeSent(false);
    onOpenChange(false);
  };

  const social = async (provider: "google" | "apple") => {
    setError(""); setMessage(""); setBusy(true);
    sessionStorage.setItem("lash-intent-signin", "1");
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin, extraParams: provider === "google" ? { prompt: "select_account" } : {} });
    if (result.error) { setError("تعذّر تسجيل الدخول، حاولي مرة أخرى"); setBusy(false); return; }
    if (result.redirected) return;
    setBusy(false);
    onOpenChange(false);
  };

  const validEmail = (value: string) => value.includes("@");

  const submit = async () => {
    const mail = email.trim();
    if (!validEmail(mail)) { setError("أدخلي بريداً إلكترونياً صحيحاً"); return; }
    if (password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    setError(""); setMessage(""); setBusy(true);
    if (mode === "signin") {
      sessionStorage.setItem("lash-intent-signin", "1");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: mail, password });
      setBusy(false);
      if (signInError) { setError("بيانات الدخول غير صحيحة، تأكدي من البريد وكلمة المرور"); return; }
      onOpenChange(false);
      return;
    }
    sessionStorage.setItem("lash-intent-signin", "1");
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: mail, password, options: { emailRedirectTo: window.location.origin } });
    if (signUpError) { setBusy(false); setError("تعذّر إنشاء الحساب، قد يكون البريد مسجلاً من قبل"); return; }
    if (signUpData.session) { setBusy(false); onOpenChange(false); return; }
    const { error: autoSignIn } = await supabase.auth.signInWithPassword({ email: mail, password });
    setBusy(false);
    if (autoSignIn) { setMessage("تم إنشاء حسابك، سجلي الدخول الآن"); setMode("signin"); return; }
    onOpenChange(false);
  };

  const resetPassword = async () => {
    const mail = email.trim();
    if (!validEmail(mail)) { setError("أدخلي بريدك الإلكتروني أولاً لإرسال رابط الاستعادة"); return; }
    setError(""); setMessage(""); setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (resetError) { setError("تعذّر إرسال رابط الاستعادة، حاولي مرة أخرى"); return; }
    setMessage("أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك");
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent dir="rtl" className="store max-w-md rounded-xl px-8 pb-9 pt-10 text-center">
      <div className="mx-auto grid size-20 place-items-center rounded-full border"><UserRound className="size-8 text-muted-foreground" strokeWidth={1.5} /></div>
      <DialogTitle className="sr-only">تسجيل الدخول</DialogTitle>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => switchMode("signin")} className={mode === "signin" ? "store-cta h-11 rounded-lg text-sm" : "h-11 rounded-lg border text-sm font-bold text-muted-foreground transition hover:text-foreground"}>تسجيل الدخول</button>
        <button type="button" onClick={() => switchMode("signup")} className={mode === "signup" ? "store-cta h-11 rounded-lg text-sm" : "h-11 rounded-lg border text-sm font-bold text-muted-foreground transition hover:text-foreground"}>إنشاء حساب</button>
      </div>

      <div className="mt-4 flex justify-center gap-4 text-xs font-bold">
        <button type="button" onClick={() => { setMethod("phone"); setError(""); setMessage(""); }} className={method === "phone" ? "text-primary underline" : "text-muted-foreground"}>برقم الجوال</button>
        <button type="button" onClick={() => { setMethod("email"); setError(""); setMessage(""); }} className={method === "email" ? "text-primary underline" : "text-muted-foreground"}>بالبريد الإلكتروني</button>
      </div>

      {method === "phone" ? <div className="mt-4 space-y-3 text-right">
        {!codeSent ? <>
          <label className="text-sm font-bold" htmlFor="login-phone">رقم الجوال</label>
          <div className="flex gap-2">
            <select aria-label="الدولة" value={country} onChange={(event) => setCountry(event.target.value as "SA" | "EG")} className="h-12 rounded-md border bg-background px-2 text-sm">
              <option value="SA">🇸🇦 +966</option>
              <option value="EG">🇪🇬 +20</option>
            </select>
            <div className="relative flex-1">
              <Input id="login-phone" dir="ltr" inputMode="tel" placeholder={country === "SA" ? "0501234567" : "01012345678"} value={phone} onChange={(event) => setPhone(event.target.value)} className="h-12 pl-10 text-left" />
              <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </> : <>
          <label className="text-sm font-bold" htmlFor="login-code">رمز التحقق</label>
          <Input id="login-code" dir="ltr" inputMode="numeric" maxLength={6} placeholder="------" value={code} onChange={(event) => setCode(event.target.value)} className="h-12 text-center tracking-[0.5em]" />
          <div className="flex justify-between text-xs font-bold">
            <button type="button" disabled={busy} onClick={() => void sendCode()} className="text-primary disabled:opacity-50">إعادة إرسال الرمز</button>
            <button type="button" onClick={() => { setCodeSent(false); setCode(""); setError(""); setMessage(""); }} className="text-muted-foreground">تغيير الرقم</button>
          </div>
        </>}
      </div> : <div className="mt-5 space-y-4 text-right">
        <div className="space-y-2">
          <label className="text-sm font-bold" htmlFor="login-email">البريد الإلكتروني</label>
          <div className="relative">
            <Input id="login-email" type="email" dir="ltr" placeholder="your@email.com" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 pl-10 text-left" />
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold" htmlFor="login-password">كلمة المرور</label>
          <div className="relative">
            <Input id="login-password" type="password" dir="ltr" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 pl-10 text-left" />
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        {mode === "signin" && <button type="button" disabled={busy} onClick={() => void resetPassword()} className="text-xs font-bold text-primary transition hover:underline disabled:opacity-50">نسيت كلمة المرور؟</button>}
      </div>}

      <Button className="store-cta h-12 w-full text-base" disabled={busy} onClick={() => void (method === "phone" ? (codeSent ? verifyCode() : sendCode()) : submit())}>{method === "phone" ? (codeSent ? "تأكيد الرمز" : "إرسال رمز التحقق") : mode === "signin" ? "متابعة" : "إنشاء الحساب"}</Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {message && <p className="text-xs text-primary">{message}</p>}

      <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />أو سجل دخولك من خلال<span className="h-px flex-1 bg-border" /></div>
      <div className="flex items-center justify-center gap-4">
        <button type="button" aria-label="الدخول عبر Apple" disabled={busy} onClick={() => void social("apple")} className="grid size-12 place-items-center rounded-full bg-secondary transition hover:brightness-95 disabled:opacity-50"><AppleIcon /></button>
        <button type="button" aria-label="الدخول عبر Facebook غير متاح حالياً" disabled title="غير متاح حالياً" className="grid size-12 cursor-not-allowed place-items-center rounded-full bg-secondary opacity-40"><FacebookIcon /></button>
        <button type="button" aria-label="الدخول عبر Google" disabled={busy} onClick={() => void social("google")} className="grid size-12 place-items-center rounded-full bg-secondary transition hover:brightness-95 disabled:opacity-50"><GoogleIcon /></button>
      </div>
    </DialogContent>
  </Dialog>;
}
