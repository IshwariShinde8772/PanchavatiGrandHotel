import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ShieldCheck, Sparkles, Wine, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Button from "../../components/common/Button";
import RoomCard from "../../components/room/RoomCard";
import InputField from "../../components/forms/InputField";
import { useHomeData } from "../../hooks/useRooms";

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data } = useHomeData();
  const [search, setSearch] = useState({
    destination: "Nashik, Maharashtra",
    checkIn: "",
    checkOut: "",
    guests: 2,
  });

  const moments = [
    { title: t("home.sacredRamkund"), image: "/assets/images/ramkund.jpg", desc: t("home.sacredRamkundDesc") },
    { title: t("home.vineyardHaven"), image: "/assets/images/vineyard.jpg", desc: t("home.vineyardHavenDesc") },
    { title: t("home.ancientHeritage"), image: "/assets/images/ancientheritage.jpg", desc: t("home.ancientHeritageDesc") },
  ];

  const values = [
    { icon: ShieldCheck, title: t("home.curatedSelection"), desc: t("home.curatedSelectionDesc") },
    { icon: MapPin, title: t("home.heritageLocation"), desc: t("home.heritageLocationDesc") },
    { icon: Sparkles, title: t("home.cleanDesign"), desc: t("home.cleanDesignDesc") },
    { icon: Wine, title: t("home.localSoul"), desc: t("home.localSoulDesc") },
  ];

  return (
    <div className="relative">
      <a
        href="https://wa.me/9102534447777"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-hover-effect fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition-transform hover:scale-110 active:scale-95"
      >
        <MessageCircle size={32} />
      </a>

      <section className="relative h-[88vh] w-full overflow-hidden">
        <img src="/assets/images/mainimage.jpg" alt="Panchavati Grand - Nashik" className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center" style={{ background: "linear-gradient(to right, rgba(10,77,52,0.75) 40%, rgba(10,77,52,0.2))" }}>
          <div className="container-shell w-full text-white">
            <div className="max-w-2xl">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em]" style={{ color: "#a7f3d0" }}>{t("home.collection")}</p>
              <h1 className="font-heading text-5xl font-bold leading-tight text-white md:text-6xl">{t("home.title")}</h1>
              <p className="mt-6 text-lg leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>{t("home.subtitle")}</p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a href="/rooms" className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-sm font-bold transition-opacity hover:opacity-90" style={{ backgroundColor: "#ffffff", color: "#0A4D34" }}>
                  {t("common.viewRooms")}
                </a>
                <a href="#enquiry" className="inline-flex items-center justify-center rounded-lg border-2 px-8 py-3 text-sm font-bold transition-opacity hover:opacity-90" style={{ borderColor: "rgba(255,255,255,0.6)", color: "#ffffff" }}>
                  {t("common.contactUs")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell relative z-10 -mt-16">
        <div className="rounded-xl border border-divider/20 bg-white p-6 shadow-float">
          <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-4">
            <InputField label={t("home.where")} value={search.destination} onChange={(event) => setSearch({ ...search, destination: event.target.value })} />
            <InputField label={t("home.checkIn")} type="date" value={search.checkIn} onChange={(event) => setSearch({ ...search, checkIn: event.target.value })} />
            <InputField label={t("home.checkOut")} type="date" value={search.checkOut} onChange={(event) => setSearch({ ...search, checkOut: event.target.value })} />
            <Button variant="primary" className="h-11 w-full" onClick={() => navigate(`/rooms?checkIn=${search.checkIn}&checkOut=${search.checkOut}&guests=${search.guests}`)}>
              {t("home.findStay")}
            </Button>
          </div>
        </div>
      </section>

      <section className="container-shell py-24">
        <div className="mb-12 flex flex-col items-end justify-between md:flex-row">
          <div className="max-w-xl">
            <h2 className="font-heading text-4xl font-bold text-primary">{t("home.momentsTitle")}</h2>
            <p className="mt-4 text-lg leading-relaxed text-mutedText">{t("home.momentsText")}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {moments.map((item) => (
            <div key={item.title} className="group cursor-pointer" onClick={() => navigate("/rooms")}>
              <div className="mb-6 h-[400px] overflow-hidden rounded-xl">
                <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-primary">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-mutedText">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-primary py-24 text-white">
        <div className="container-shell">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="space-y-4">
                <Icon size={32} className="text-secondaryLight/50" />
                <h4 className="font-heading text-xl font-bold">{title}</h4>
                <p className="text-sm leading-relaxed text-white/70">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-24">
        <div className="mb-16 text-center">
          <h2 className="font-heading text-4xl font-bold text-primary">{t("home.accommodations")}</h2>
          <div className="mx-auto mt-4 h-[1px] w-24 bg-primary/20" />
        </div>
        <div className="grid gap-12 lg:grid-cols-4">
          {(data?.featuredRooms || []).map((room) => (
            <RoomCard key={room.id} room={room} compact />
          ))}
        </div>
        <div className="mt-16 text-center">
          <Button variant="outline" onClick={() => navigate("/rooms")} className="px-12">{t("home.browseCollection")}</Button>
        </div>
      </section>

      <section className="container-shell py-12">
        <div className="grid overflow-hidden rounded-2xl shadow-2xl md:grid-cols-2">
          <div className="h-[500px]">
            <img src="/assets/images/vineyard.jpg" className="h-full w-full object-cover" alt="Vineyard" />
          </div>
          <div className="flex flex-col justify-center bg-primaryLight/50 p-16">
            <h3 className="font-heading text-4xl font-bold italic text-primary">{t("home.vineyardRetreat")}</h3>
            <p className="mt-6 text-lg leading-relaxed text-darkText/80">{t("home.vineyardRetreatDesc")}</p>
            <Button className="mt-10 self-start px-8" onClick={() => navigate("/rooms")}>{t("home.bookPackage")}</Button>
          </div>
        </div>
      </section>

      <section className="container-shell py-24">
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-8">
            <h2 className="font-heading text-5xl font-bold leading-tight text-primary">{t("home.planStay")}</h2>
            <p className="text-xl leading-relaxed text-mutedText">{t("home.conciergeText")}</p>
            <div className="flex items-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold uppercase text-white">PC</div>
              <div>
                <p className="text-lg font-bold">{t("home.concierge")}</p>
                <p className="text-sm text-mutedText">{t("home.responseTime")}</p>
              </div>
            </div>
          </div>
          <div className="section-card bg-white p-10" id="enquiry">
            <h3 className="mb-8 font-heading text-2xl font-bold text-primary">{t("home.quickEnquiry")}</h3>
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); toast.success(t("home.enquirySent")); }}>
              <InputField label={t("home.name")} placeholder={t("home.fullName")} required />
              <InputField label={t("home.email")} type="email" placeholder="example@email.com" required />
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-mutedText">{t("home.message")}</span>
                <textarea className="h-32 w-full resize-none rounded-lg border border-divider p-4 font-sans outline-none transition-colors focus:border-primary" placeholder={t("home.requirements")} required />
              </div>
              <Button type="submit" variant="primary" className="w-full py-4 text-xs font-bold uppercase tracking-widest">{t("home.sendRequest")}</Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
