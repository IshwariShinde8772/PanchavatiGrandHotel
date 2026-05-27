import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, Heart, Menu, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Button from "./Button";
import { useAuthStore } from "../../store/authStore";
import LanguageSwitcher from "../i18n/LanguageSwitcher";

const navItems = [
  { labelKey: "common.home", to: "/" },
  { labelKey: "common.rooms", to: "/rooms" },
  { labelKey: "common.offers", to: "/offers" },
  { labelKey: "common.about", to: "/about" },
  { labelKey: "common.contact", to: "/contact" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-40 border-b border-divider/50 bg-white/95 backdrop-blur">
      <div className="container-shell flex h-20 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary font-heading text-xl font-bold text-white">P</div>
          <div>
            <p className="font-heading text-xl font-bold leading-none tracking-tight text-primary">{t("common.hotelName")}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-mutedText">{t("common.heritage")}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-10 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className="text-[11px] font-medium uppercase tracking-widest text-darkText/70 transition-colors hover:text-primary">
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <LanguageSwitcher />
          <button
            onClick={() => user ? navigate("/customer/my-rooms") : toast(t("common.wishlistLogin"))}
            className="text-mutedText transition-colors hover:text-primary"
          >
            <Heart size={18} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => user ? navigate("/customer/notifications") : toast(t("common.notificationsLogin"))}
            className="text-mutedText transition-colors hover:text-primary"
          >
            <Bell size={18} strokeWidth={1.5} />
          </button>
          {user ? (
            <Link to="/customer" className="flex items-center gap-2 border-b-2 border-primary pb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              <User size={14} />
              {user.full_name || user.name || t("common.dashboard")}
            </Link>
          ) : (
            <Button as={Link} to="/login" className="h-10 min-h-0 px-8 text-[10px] font-bold uppercase tracking-[0.2em]">
              {t("common.login")}
            </Button>
          )}
        </div>

        <button className="rounded-lg bg-slate-100 p-2 text-slate-600 lg:hidden" onClick={() => setOpen((prev) => !prev)}>
          <Menu size={20} />
        </button>
      </div>

      {open ? (
        <div className="animate-in fade-in slide-in-from-top-4 border-t border-divider bg-white px-4 pb-4 shadow-lg lg:hidden">
          <div className="flex flex-col gap-1 pt-4">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className="rounded-xl px-4 py-3 font-medium text-slate-600 hover:bg-slate-50" onClick={() => setOpen(false)}>
                {t(item.labelKey)}
              </NavLink>
            ))}
            <div className="px-4 py-3">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
