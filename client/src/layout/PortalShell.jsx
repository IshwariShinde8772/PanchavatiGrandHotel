import { Menu, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/common/Sidebar";
import LanguageSwitcher from "../components/i18n/LanguageSwitcher";

export default function PortalShell({ title, subtitle, items, children }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="container-shell py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-3xl">{title}</h1>
          {subtitle ? <p className="text-sm text-mutedText">{subtitle}</p> : null}
        </div>
        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <LanguageSwitcher compact />
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-vineyard transition hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            {t("portal.backHome")}
          </button>
          <button
            className="rounded-full p-3 text-white transition-opacity hover:opacity-90 lg:hidden"
            style={{ backgroundColor: "#0A4D34" }}
            onClick={() => setOpen((prev) => !prev)}
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
        <div className={open ? "block" : "hidden lg:block"}>
          <Sidebar items={items} title={title} subtitle={subtitle} />
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
