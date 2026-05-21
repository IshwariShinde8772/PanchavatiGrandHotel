import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="container-shell py-10">
      <PageHeader
        eyebrow={t("publicPages.aboutEyebrow")}
        title={t("publicPages.aboutTitle")}
        description={t("publicPages.aboutDescription")}
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="section-card p-6">
          <h2 className="font-heading text-3xl">{t("publicPages.whyNashikTitle")}</h2>
          <p className="mt-4 text-mutedText">{t("publicPages.whyNashikText")}</p>
        </div>
        <div className="section-card p-6">
          <h2 className="font-heading text-3xl">{t("publicPages.designTitle")}</h2>
          <p className="mt-4 text-mutedText">{t("publicPages.designText")}</p>
        </div>
      </div>
    </div>
  );
}
