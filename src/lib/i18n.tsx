import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

type LangContextValue = {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  /** t("النص العربي", "English text") */
  t: (ar: string, en?: string) => string;
};

const LangContext = createContext<LangContextValue | null>(null);
const STORAGE_KEY = "lash-lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ar") setLangState(stored);
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
  }, [lang]);

  const value = useMemo<LangContextValue>(() => {
    const setLang = (next: Lang) => {
      localStorage.setItem(STORAGE_KEY, next);
      setLangState(next);
    };
    return {
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      toggleLang: () => setLang(lang === "ar" ? "en" : "ar"),
      t: (ar: string, en?: string) => (lang === "en" ? (en ?? ar) : ar),
    };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (ctx) return ctx;
  return {
    lang: "ar",
    dir: "rtl",
    setLang: () => {},
    toggleLang: () => {},
    t: (ar: string) => ar,
  };
}
