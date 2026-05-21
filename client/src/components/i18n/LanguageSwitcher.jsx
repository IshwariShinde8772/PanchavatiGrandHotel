import { Check, ChevronDown, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supportedLanguages } from "../../i18n";

export default function LanguageSwitcher({ compact = false }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const selectedLanguage = supportedLanguages.find((language) => language.code === i18n.language) || supportedLanguages[0];

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleSelect = (language) => {
    i18n.changeLanguage(language.code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label={t("common.language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-primary/15 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-vineyard shadow-sm ring-1 ring-transparent transition-all duration-200 hover:border-primary/35 hover:bg-primaryLight/40 hover:shadow-md focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
          <Languages size={15} strokeWidth={2.2} />
        </span>
        <span className={compact ? "sr-only" : ""}>{t("common.language")}</span>
        <span className="min-w-[72px] text-left text-primary">
          {compact ? selectedLanguage.shortLabel : selectedLanguage.label}
        </span>
        <ChevronDown size={15} className={`text-primary transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-52 overflow-hidden rounded-2xl border border-primary/15 bg-white p-2 shadow-2xl ring-1 ring-black/5">
          <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-mutedText">
            {t("common.language")}
          </div>
          <div role="listbox" aria-label={t("common.language")} className="space-y-1">
            {supportedLanguages.map((language) => {
              const active = language.code === i18n.language;

              return (
                <button
                  key={language.code}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(language)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors ${
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "text-darkText hover:bg-primaryLight hover:text-primary"
                  }`}
                >
                  <span>{language.label}</span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full ${active ? "bg-white/20" : "bg-primary/10 text-primary"}`}>
                    {active ? <Check size={13} strokeWidth={3} /> : language.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
