import { useTranslation } from "react-i18next";

export default function FileUpload({ label, accept = "image/*,.pdf", onChange, currentFileLabel = "" }) {
  const { t } = useTranslation();
  return (
    <div className="block">
      {label ? <span className="mb-2 block text-sm font-medium text-darkText">{label}</span> : null}
      <div className="rounded-[24px] border border-dashed border-divider bg-saffronLight/50 p-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <span className="rounded-lg border border-divider bg-white px-3 py-2 font-semibold text-vineyard">
            {currentFileLabel ? t("ops.replaceFile") : t("ops.chooseFile")}
          </span>
          <span className={currentFileLabel ? "font-semibold text-success" : "text-mutedText"}>
            {currentFileLabel || t("ops.noFileChosen")}
          </span>
          <input type="file" accept={accept} onChange={onChange} className="sr-only" />
        </label>
        <p className="mt-2 text-xs text-mutedText">{t("ops.acceptedFiles")}</p>
      </div>
    </div>
  );
}

