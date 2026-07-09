import { useTranslation } from "react-i18next";

export default function PaginationControls({ page = 1, totalPages = 1, onPageChange }) {
  const { t } = useTranslation();
  const safePage = Math.max(Number(page) || 1, 1);
  const safeTotal = Math.max(Number(totalPages) || 1, 1);

  if (safeTotal <= 1) {
    return null;
  }

  const pages = Array.from({ length: safeTotal }, (_, index) => index + 1)
    .filter((item) => item === 1 || item === safeTotal || Math.abs(item - safePage) <= 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider bg-white px-5 py-4 text-sm">
      <p className="font-semibold text-mutedText">{t("shared.pageOf", { page: safePage, total: safeTotal })}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-divider px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          {t("shared.previous")}
        </button>
        {pages.map((item, index) => {
          const previous = pages[index - 1];
          return (
            <span key={item} className="flex items-center gap-2">
              {previous && item - previous > 1 ? <span className="text-mutedText">...</span> : null}
              <button
                type="button"
                className={`h-8 min-w-8 rounded-lg px-2 font-bold ${
                  item === safePage ? "bg-vineyard text-white" : "border border-divider bg-white text-vineyard"
                }`}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          className="rounded-lg border border-divider px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          disabled={safePage >= safeTotal}
          onClick={() => onPageChange(safePage + 1)}
        >
          {t("shared.next")}
        </button>
      </div>
    </div>
  );
}
