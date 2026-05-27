import PageHeader from "../../components/common/PageHeader";
import { useHomeData } from "../../hooks/useRooms";
import { useTranslation } from "react-i18next";

export default function Offers() {
  const { t } = useTranslation();
  const { data } = useHomeData();
  const offers = data?.offers || [];

  return (
    <div className="container-shell py-10">
      <PageHeader 
        eyebrow={t("publicPages.offersEyebrow")} 
        title={t("publicPages.offersTitle")} 
        description={t("publicPages.offersDescription")} 
      />
      
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {offers.map((offer) => (
          <div 
            key={offer.id || offer.title} 
            className="flex flex-col rounded-3xl p-8 shadow-lg transition-transform hover:-translate-y-2"
            style={{ backgroundImage: "linear-gradient(135deg, #0A4D34 0%, #173829 100%)", color: "white" }}
          >
            <div className="mb-6 flex-1">
              <h2 className="font-heading text-2xl font-bold tracking-wide">{offer.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/80">{offer.description}</p>
            </div>
            
            <div className="mt-auto border-t border-white/20 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#eab308]">
                {offer.end_date ? t("publicPages.validUntil", { date: offer.end_date }) : t("publicPages.limitedPeriod")}
              </p>
              <div className="mt-3 inline-block rounded-lg border border-white/30 bg-white/10 px-4 py-2 font-mono text-sm tracking-widest backdrop-blur-sm">
                {offer.discount_pct}% OFF
              </div>
            </div>
          </div>
        ))}
        {offers.length === 0 ? <p className="text-mutedText">{t("publicPages.noOffers")}</p> : null}
      </div>
    </div>
  );
}
