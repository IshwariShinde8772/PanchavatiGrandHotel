import { NavLink, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";

export default function Sidebar({ items, title, subtitle }) {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="rounded-xl p-6 text-white shadow-lg flex flex-col min-h-[calc(100vh-120px)]" style={{ backgroundColor: "#0A4D34" }}>
      <div className="mb-8">
        <p className="font-heading text-2xl font-bold tracking-wide">{title}</p>
        {subtitle ? <p className="mt-2 text-sm opacity-80 leading-relaxed">{subtitle}</p> : null}
      </div>

      <nav className="space-y-1.5 flex-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                "flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold tracking-wider uppercase transition-colors duration-200",
                isActive ? "bg-white text-[#0A4D34]" : "text-white/80 hover:bg-white/10 hover:text-white"
              )
            }
          >
            {item.icon ? <item.icon size={16} strokeWidth={2} /> : null}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 pt-6 border-t border-white/20">
        <button
          onClick={handleLogout}
          className="flex w-full min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold tracking-wider uppercase transition-colors duration-200 text-white/80 hover:bg-red-500/20 hover:text-white"
        >
          <LogOut size={16} strokeWidth={2} />
          <span>{t("common.logout")}</span>
        </button>
      </div>
    </aside>
  );
}
