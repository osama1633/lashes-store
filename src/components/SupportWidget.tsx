import { useEffect, useRef, useState } from "react";
import { Home, MessageSquare, Megaphone, X, Send, CheckCircle2 } from "lucide-react";
import { STORE_NEWS } from "@/lib/support-news";

type Msg = { role: "user" | "assistant"; content: string };
type Tab = "home" | "messages" | "news";

const GREETING: Msg = {
  role: "assistant",
  content: "هلا والله 👋 أنا مساعدة LASHES ½. اسأليني عن المنتج، الشحن، الطلب، أو أي مشكلة تواجهك في الموقع.",
};

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, tab]);

  useEffect(() => {
    if (open && tab === "messages") inputRef.current?.focus();
  }, [open, tab]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setError(null);
    setInput("");
    const history: Msg[] = [...messages, { role: "user", content: clean }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) {
        setMessages([
          ...history,
          { role: "assistant", content: "ما وصلتني إجابة، جرّبي إعادة صياغة السؤال." },
        ]);
      }
    } catch {
      setMessages(history);
      setError("تعذّر الوصول للمساعد الآن. جرّبي مرة أخرى أو تواصلي عبر واتساب.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <button
        id="support-widget-trigger"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="الدعم والمساعدة"
        className="fixed bottom-4 left-3 z-50 grid size-11 place-items-center rounded-full bg-[oklch(0.55_0.21_349)] text-white shadow-lg transition hover:scale-105"
      >
        {open ? (
          <X className="size-5" />
        ) : (
          <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
            <rect x="4.5" y="5" width="15" height="15" rx="5.5" fill="white" />
            <path
              d="M8.8 12.6c.9 1.5 2.1 2.3 3.2 2.3s2.3-.8 3.2-2.3"
              stroke="oklch(0.55 0.21 349)"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div
          dir="rtl"
          className="fixed bottom-[4.75rem] left-5 z-50 flex h-[560px] max-h-[80vh] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
        >
          <div className="flex-1 overflow-y-auto" ref={scrollRef}>
            {tab === "home" && (
              <div className="bg-[#a8f0d8] px-5 pb-8 pt-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="إغلاق"
                  className="grid size-8 place-items-center rounded-full text-[#0f5b52] hover:bg-white/50"
                >
                  <X className="size-5" />
                </button>
                <h3 className="mt-6 text-right text-2xl font-extrabold leading-9 text-[#0b3f39]">
                  هلا والله 👋
                  <br />
                  جاهزين نساعدك
                </h3>
                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => setTab("messages")}
                    className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 text-right font-bold text-[#0b3f39] shadow-sm transition hover:shadow-md"
                  >
                    <span>أرسلي لنا رسالة</span>
                    <Send className="size-4 rotate-180 text-[#0f5b52]" />
                  </button>
                  <a
                    href="https://wa.me/966502203636"
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 text-right font-bold text-[#0b3f39] shadow-sm transition hover:shadow-md"
                  >
                    <span>تواصلي مع فريق الدعم على واتساب</span>
                    <MessageSquare className="size-4 text-[#0f5b52]" />
                  </a>
                  <div className="flex w-full items-center justify-end gap-3 rounded-2xl bg-white px-4 py-4 text-right font-bold text-[#0b3f39] shadow-sm">
                    <span>جميع الأنظمة تعمل بشكل طبيعي</span>
                    <CheckCircle2 className="size-5 text-primary" />
                  </div>
                </div>
              </div>
            )}

            {tab === "messages" && (
              <div className="flex min-h-full flex-col">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="إغلاق"
                    className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-5" />
                  </button>
                  <b className="text-[#0b3f39]">الرسائل</b>
                  <span className="size-8" />
                </div>
                <div className="flex-1 space-y-3 px-4 py-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={msg.role === "user" ? "flex justify-start" : "flex justify-end"}
                    >
                      <div
                        className={
                          msg.role === "user"
                            ? "max-w-[85%] rounded-2xl bg-[#0f5b52] px-4 py-2.5 text-sm leading-6 text-white"
                            : "max-w-[90%] whitespace-pre-wrap rounded-2xl bg-[#f1f6f5] px-4 py-2.5 text-sm leading-6 text-[#0b3f39]"
                        }
                      >
                        {msg.content || (busy ? "…" : "")}
                      </div>
                    </div>
                  ))}
                  {error && <p className="text-center text-xs text-destructive">{error}</p>}
                </div>
              </div>
            )}

            {tab === "news" && (
              <div className="flex min-h-full flex-col">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="إغلاق"
                    className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-5" />
                  </button>
                  <b className="text-[#0b3f39]">الأخبار</b>
                  <span className="size-8" />
                </div>
                <div className="space-y-3 px-4 py-4">
                  <p className="text-right text-xs text-muted-foreground">آخر الأخبار من فريق LASHES ½</p>
                  {STORE_NEWS.map((item) => (
                    <article key={item.id} className="rounded-2xl bg-[#e9fbf4] p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.badge && (
                          <span className="rounded-full bg-[#0f5b52] px-2 py-0.5 text-[11px] font-bold text-white">
                            {item.badge}
                          </span>
                        )}
                        <b className="text-[#0b3f39]">{item.title}</b>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#0b3f39]/80">{item.body}</p>
                      <span className="mt-2 block text-[11px] text-muted-foreground">{item.date}</span>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          {tab === "messages" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
              className="flex items-center gap-2 border-t px-3 py-3"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="اكتبي سؤالك هنا..."
                className="h-11 flex-1 rounded-full bg-[#f1f6f5] px-4 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="إرسال"
                className="grid size-11 place-items-center rounded-full bg-[#0f5b52] text-white disabled:opacity-50"
              >
                <Send className="size-4 rotate-180" />
              </button>
            </form>
          )}

          <nav className="grid grid-cols-3 border-t bg-white">
            {(
              [
                ["news", "الأخبار", Megaphone],
                ["messages", "الرسائل", MessageSquare],
                ["home", "الصفحة الرئيسية", Home],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] font-bold transition ${
                  tab === id ? "text-[#0f5b52]" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
