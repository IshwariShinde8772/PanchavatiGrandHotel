import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, Heart, Languages, Menu, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Button from "./Button";
import { useAuthStore } from "../../store/authStore";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Rooms", to: "/rooms" },
  { label: "Offers", to: "/offers" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { i18n, t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-40 border-b border-divider/50 bg-white/95 backdrop-blur">
      <div className="container-shell flex h-20 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-sm bg-primary text-white font-heading font-bold text-xl">P</div>
          <div>
            <p className="font-heading text-xl font-bold text-primary leading-none tracking-tight">Panchavati Grand</p>
            <p className="text-[9px] uppercase font-bold tracking-[0.3em] text-mutedText mt-1">Heritage Collection • Nashik</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-10 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className="text-sm font-medium text-darkText/70 hover:text-primary transition-colors uppercase tracking-widest text-[11px]">
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <button
            className="text-[10px] font-bold text-mutedText hover:text-primary uppercase tracking-widest"
            onClick={() => i18n.changeLanguage(i18n.language === "en" ? "hi" : i18n.language === "hi" ? "mr" : "en")}
          >
            {i18n.language.toUpperCase()}
          </button>
          <button onClick={() => user ? navigate("/customer/my-rooms") : toast("Login to view wishlist", { icon: "❤️" })} className="text-mutedText hover:text-primary transition-colors">
            <Heart size={18} strokeWidth={1.5} />
          </button>
          <button onClick={() => user ? navigate("/customer/notifications") : toast("Login to view notifications", { icon: "🔔" })} className="text-mutedText hover:text-primary transition-colors">
            <Bell size={18} strokeWidth={1.5} />
          </button>
          {user ? (
            <Link to="/customer" className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest border-b-2 border-primary pb-1">
              <User size={14} />
              {user.full_name || user.name || "Dashboard"}
            </Link>
          ) : (
            <Button as={Link} to="/login" className="px-8 h-10 min-h-0 text-[10px] uppercase tracking-[0.2em] font-bold">Login</Button>
          )}
        </div>

        <button className="rounded-lg bg-slate-100 p-2 text-slate-600 lg:hidden" onClick={() => setOpen((prev) => !prev)}>
          <Menu size={20} />
        </button>
      </div>

      {open ? (
        <div className="border-t border-divider bg-white px-4 pb-4 lg:hidden shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col gap-1 pt-4">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className="rounded-xl px-4 py-3 text-slate-600 hover:bg-slate-50 font-medium" onClick={() => setOpen(false)}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}

