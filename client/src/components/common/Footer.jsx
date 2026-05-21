import { useQuery } from "@tanstack/react-query";
import { Facebook, Instagram, MapPin, Phone, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { settingsAPI } from "../../api/settingsAPI";

export default function Footer() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => settingsAPI.public(),
  });

  const hotel = data?.data;
  const links = [
    { label: t("common.rooms"), to: "/rooms" },
    { label: t("common.offers"), to: "/offers" },
    { label: t("common.about"), to: "/about" },
    { label: t("common.contact"), to: "/contact" },
    { label: t("common.careers"), to: "/contact" },
  ];

  return (
    <footer className="mt-20 py-10" style={{ backgroundColor: "#0A4D34", color: "#F9FAF9" }}>
      <div className="container-shell grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img src="/assets/images/lotus-icon.svg" alt="Lotus" className="h-10 w-10 brightness-0 invert" />
            <div>
              <p className="font-heading text-2xl font-bold tracking-wide text-white">{t("common.hotelName")}</p>
              <p className="text-sm font-bold uppercase tracking-wider text-[#eab308]">{t("common.tagline")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm opacity-80">{hotel?.address || "Near Ramkund Ghat, Panchavati, Nashik, Maharashtra 422003"}</p>
        </div>

        <div>
          <p className="font-heading text-xl font-bold">{t("footer.quickLinks")}</p>
          <div className="mt-4 space-y-2 text-sm font-medium">
            {links.map((item) => (
              <Link key={item.label} to={item.to} className="block opacity-80 transition-opacity hover:text-white hover:opacity-100">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="font-heading text-xl font-bold">{t("common.contact")}</p>
          <div className="mt-4 space-y-3 text-sm opacity-80">
            <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5" /> {hotel?.address || "Near Ramkund Ghat, Panchavati, Nashik, Maharashtra 422003"}</p>
            <p className="flex items-center gap-2"><Phone size={16} /> {hotel?.phone || "+91-0253-4447777"}</p>
            <p>{hotel?.email || "stay@panchavatgrand.in"}</p>
          </div>
        </div>

        <div>
          <p className="font-heading text-xl font-bold">{t("footer.followUs")}</p>
          <div className="mt-4 flex gap-3">
            {[Instagram, Facebook, Youtube].map((Icon, index) => (
              <a key={index} href="#" className="rounded-full bg-white/10 p-3 transition-colors hover:bg-white/20">
                <Icon size={18} />
              </a>
            ))}
          </div>
          <div className="mt-6 space-y-2 text-xs opacity-70">
            <p>{t("footer.secure")}</p>
            <p>{t("footer.ssl")}</p>
            <p>{t("footer.gst")}</p>
          </div>
        </div>
      </div>
      <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm opacity-70">
        {t("footer.rights")}
      </div>
    </footer>
  );
}
