import { useT } from "./i18n";

// Compact segmented control for switching UI language (EN / SQ / MK).
export default function LanguageSwitcher({ className = "" }) {
  const { lang, setLang, langs } = useT();

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-lg bg-slate-800 p-0.5 ${className}`}
    >
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          title={l.name}
          aria-pressed={lang === l.code}
          className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
            lang === l.code
              ? "bg-amber-500 text-slate-950"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
