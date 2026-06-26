import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { translations, LANGS } from "./translations";

const STORAGE_KEY = "fleet_lang";
const DEFAULT_LANG = "en";

const I18nContext = createContext(null);

function resolve(dict, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), dict);
}

function interpolate(str, vars) {
  if (!vars || typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return translations[stored] ? stored : DEFAULT_LANG;
  });

  const setLang = useCallback((next) => {
    if (!translations[next]) return;
    localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  }, []);

  // t(key, vars) — look up in current language, fall back to English, then the key itself.
  const t = useCallback(
    (key, vars) => {
      const value =
        resolve(translations[lang], key) ??
        resolve(translations[DEFAULT_LANG], key) ??
        key;
      return interpolate(value, vars);
    },
    [lang]
  );

  const value = useMemo(() => ({ t, lang, setLang, langs: LANGS }), [t, lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used inside I18nProvider");
  return ctx;
}
