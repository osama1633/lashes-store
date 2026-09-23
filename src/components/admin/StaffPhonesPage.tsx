import { useEffect, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toE164 } from "@/lib/staff-auth.functions";

type Staff = { id: string; phone: string; name: string | null; role: string; is_active: boolean; created_at: string };
const roleLabel: Record<string, string> = { admin: "مدير (كل الصلاحيات)", staff: "موظف (تشغيل المتجر)" };

export function StaffPhonesPage() {
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("staff_phones").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Staff[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const remove = async (row: Staff) => {
    if (!confirm(`حذف ${row.name || row.phone} من الموظفين؟ لن يستطيع الدخول بعد الحذف.`)) return;
    const { error: err } = await supabase.from("staff_phones").delete().eq("id", row.id);
    if (err) { setError("تعذر حذف الموظف، تأكد من صلاحيتك."); return; }
    setError(""); await load();
  };
  const toggle = async (row: Staff, value: boolean) => {
    const { error: err } = await supabase.from("staff_phones").update({ is_active: value }).eq("id", row.id);
    if (err) { setError("تعذر تعديل حالة الموظف."); return; }
    setError(""); await load();
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-extrabold">الموظفين ({rows.length})</h2>
        <p className="mt-1 text-xs text-muted-foreground">كل رقم مضاف هنا يستطيع الدخول للوحة التحكم برمز تحقق يُرسل إلى جواله، وأي رقم غير مضاف لا يُسمح له بالدخول.</p>
      </div>
      <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus />إضافة موظف</Button>
    </div>
    {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <section className="rounded-lg border bg-card p-5">
      {loading ? <p className="py-10 text-center text-sm text-muted-foreground">جارٍ تحميل الموظفين...</p>
        : rows.length === 0 ? <div className="grid place-items-center gap-3 py-12 text-center text-muted-foreground"><Users className="size-8" /><p className="text-sm">لا يوجد موظفون حتى الآن</p></div>
        : <Table>
          <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>رقم الجوال</TableHead><TableHead>الصلاحية</TableHead><TableHead>مسموح بالدخول</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((row) => <TableRow key={row.id}>
            <TableCell className="font-semibold">{row.name || "بدون اسم"}</TableCell>
            <TableCell dir="ltr" className="font-mono">{row.phone}</TableCell>
            <TableCell>{roleLabel[row.role] ?? row.role}</TableCell>
            <TableCell><Switch checked={row.is_active} onCheckedChange={(v) => void toggle(row, v)} /></TableCell>
            <TableCell><div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => { setEditing(row); setOpen(true); }}>تعديل</Button>
              <Button size="icon" variant="ghost" className="text-destructive" aria-label="حذف الموظف" onClick={() => void remove(row)}><Trash2 /></Button>
            </div></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
    </section>
    <StaffDialog open={open} editing={editing} onOpenChange={setOpen} onSaved={load} />
  </div>;
}

function StaffDialog({ open, editing, onOpenChange, onSaved }: { open: boolean; editing: Staff | null; onOpenChange: (v: boolean) => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: "", country: "SA", phone: "", role: "staff", is_active: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setError("");
    setForm(editing
      ? { name: editing.name ?? "", country: editing.phone.startsWith("+20") ? "EG" : "SA", phone: editing.phone.replace(/^\+(966|20)/, ""), role: editing.role, is_active: editing.is_active }
      : { name: "", country: "SA", phone: "", role: "staff", is_active: true });
  }, [editing, open]);

  const save = async () => {
    setError("");
    const phone = toE164(form.country as "SA" | "EG", form.phone);
    if (!form.name.trim()) { setError("أدخل اسم الموظف."); return; }
    if (!phone) { setError(form.country === "SA" ? "رقم سعودي غير صحيح، مثال: 0501234567" : "رقم مصري غير صحيح، مثال: 01012345678"); return; }
    setBusy(true);
    const payload = { name: form.name.trim(), phone, role: form.role as "admin" | "staff", is_active: form.is_active };
    const { error: err } = editing
      ? await supabase.from("staff_phones").update(payload).eq("id", editing.id)
      : await supabase.from("staff_phones").insert(payload);
    setBusy(false);
    if (err) { setError(/duplicate|unique/i.test(err.message) ? "هذا الرقم مضاف بالفعل." : "تعذر حفظ الموظف، تأكد من صلاحيتك."); return; }
    onOpenChange(false);
    await onSaved();
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent dir="rtl">
    <DialogHeader><DialogTitle>{editing ? "تعديل موظف" : "إضافة موظف"}</DialogTitle></DialogHeader>
    <label className="space-y-1 text-sm"><span>اسم الموظف</span><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: نورة العتيبي" /></label>
    <div className="grid grid-cols-[7.5rem_1fr] gap-2">
      <label className="space-y-1 text-sm"><span>الدولة</span>
        <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="SA">🇸🇦 +966</SelectItem><SelectItem value="EG">🇪🇬 +20</SelectItem></SelectContent>
        </Select>
      </label>
      <label className="space-y-1 text-sm"><span>رقم الجوال</span><Input dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={form.country === "SA" ? "0501234567" : "01012345678"} /></label>
    </div>
    <label className="space-y-1 text-sm"><span>الصلاحية</span>
      <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="staff">{roleLabel["staff"]}</SelectItem><SelectItem value="admin">{roleLabel["admin"]}</SelectItem></SelectContent>
      </Select>
    </label>
    <label className="flex items-center justify-between rounded-md border p-3 text-sm">مسموح له بالدخول<Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></label>
    {error && <p className="text-sm text-destructive">{error}</p>}
    <Button onClick={() => void save()} disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ الموظف"}</Button>
  </DialogContent></Dialog>;
}
