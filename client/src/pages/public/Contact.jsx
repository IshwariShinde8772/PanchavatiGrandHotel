import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import NashikMapWidget from "../../components/common/NashikMapWidget";

export default function Contact() {
  const { t } = useTranslation();

  return (
    <div className="container-shell py-10">
      <PageHeader
        eyebrow={t("publicPages.contactEyebrow")}
        title={t("publicPages.contactTitle")}
        description={t("publicPages.contactDescription")}
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="section-card p-6">
          <h3 className="font-heading text-3xl">{t("publicPages.reachUs")}</h3>
          <div className="mt-4 space-y-3 text-mutedText">
            <p>Near Ramkund Ghat, Panchavati, Nashik, Maharashtra 422003</p>
            <p>Phone: +91-0253-4447777</p>
            <p>Email: stay@panchavatgrand.in</p>
            <p>WhatsApp: +91-99999-99999</p>
          </div>
        </div>
        <NashikMapWidget />
      </div>
    </div>
  );
}
