import { useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Reveals an element once it scrolls into view. */
export function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    if (reduced()) { setSeen(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setSeen(true); observer.disconnect(); }
    }, { threshold, rootMargin: "0px 0px -8% 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen, threshold]);
  return { ref, seen };
}

const arabicDigits = (value: string) => value.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]!);

/** Counts up to `value` when scrolled into view. */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "", duration = 1400, className }: { value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number; className?: string }) {
  const { ref, seen } = useInView<HTMLSpanElement>(0.4);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced()) { setCurrent(value); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [seen, value, duration]);
  return <span ref={ref} className={className}>{prefix}{arabicDigits(current.toFixed(decimals))}{suffix}</span>;
}

/** Types text out one character at a time when scrolled into view. */
export function TypeText({ text, speed = 45, className, as: Tag = "span" }: { text: string; speed?: number; className?: string; as?: "span" | "h1" | "h2" | "h3" | "p" }) {
  const { ref, seen } = useInView<HTMLElement>(0.35);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced()) { setCount(text.length); return; }
    setCount(0);
    const timer = window.setInterval(() => {
      setCount((previous) => {
        if (previous >= text.length) { window.clearInterval(timer); return previous; }
        return previous + 1;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [seen, text, speed]);
  return <Tag ref={ref as never} className={className} aria-label={text}>
    <span aria-hidden="true">{text.slice(0, count)}</span>
    <span aria-hidden="true" className={count < text.length ? "type-caret" : "type-caret type-caret-done"} />
  </Tag>;
}

/** Adds liquid scroll-reveal motion to every section, card and heading on the page. */
export function LiquidScroll() {
  useEffect(() => {
    if (reduced()) return;
    const selector = "main section, .product-card, .review-card, .cart-line";
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entry.target.classList.add("is-revealed"); observer.unobserve(entry.target); }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    const register = () => {
      document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
        if (node.dataset["reveal"]) return;
        node.dataset["reveal"] = "1";
        node.classList.add("reveal-up");
        observer.observe(node);
      });
    };
    register();
    const mutation = new MutationObserver(register);
    mutation.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutation.disconnect(); };
  }, []);
  return null;
}
