import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Database,
  FileSpreadsheet,
  Printer,
  Search,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { logAPI } from "../../api/logAPI";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import SelectField from "../../components/forms/SelectField";
import { useDebounce } from "../../hooks/useDebounce";
import { exportTableExcel, printTable } from "../../utils/exportReports";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "../../utils/paginationMeta";
import { formatISTDateTimeForReport } from "../../utils/hotelDate";

const LEVELS = ["", "info", "warning", "error"];

const LEVEL_STYLES = {
  info: "bg-blue-50 text-blue-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
};

const EXPORT_PAGE_SIZE = 100;
const getLogExportColumns = (t) => [
  { header: t("exports.timeIst"), value: (log) => log.timestamp_ist || formatTimestamp(log.created_at) },
  { header: t("exports.storedTimeUtc"), value: (log) => log.timestamp_utc || "" },
  { header: t("admin.level"), value: (log) => log.level || "info" },
  { header: t("admin.module"), value: (log) => log.module || "system" },
  { header: t("admin.action"), value: (log) => log.action || "" },
  { header: t("admin.message"), value: (log) => log.message || "" },
  {
    header: t("admin.userRole"),
    value: (log) => `${log.actor_name || log.actor_email || ""} ${log.actor_role || "system"}${log.actor_id ? ` #${log.actor_id}` : ""}`.trim(),
  },
  { header: t("admin.entity"), value: (log) => `${log.entity_type || ""}${log.entity_id ? ` #${log.entity_id}` : ""}` },
  { header: "IP", value: (log) => log.ip_address || "" },
  { header: "User Agent", value: (log) => log.user_agent || "" },
  { header: t("admin.oldValue"), value: (log) => formatAuditValue(log.old_value) },
  { header: t("admin.newValue"), value: (log) => formatAuditValue(log.new_value) },
];

function formatTimestamp(value) {
  return value ? formatISTDateTimeForReport(value) : "—";
}

function formatAuditValue(value) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

export default function Logs() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    date: "",
    level: "",
    module: "",
    search: "",
  });
  const [exportBusy, setExportBusy] = useState("");
  const debouncedSearch = useDebounce(filters.search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-logs", page, filters.date, filters.level, filters.module, debouncedSearch],
    queryFn: () => logAPI.list({
      page,
      limit: DEFAULT_PAGE_SIZE,
      date: filters.date || undefined,
      level: filters.level || undefined,
      module: filters.module || undefined,
      search: debouncedSearch || undefined,
    }),
  });

  const logs = data?.data || [];
  const modules = data?.modules || [];
  const loggingEnabled = data?.logsEnabled !== false;
  const pagination = getPaginationMeta(data, logs.length);

  const statusMutation = useMutation({
    mutationFn: logAPI.updateStatus,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-logs"] });
      toast.success(response.message || t("shared.actionCompleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const exportFilters = () => ({
    date: filters.date || undefined,
    level: filters.level || undefined,
    module: filters.module || undefined,
    search: filters.search.trim() || undefined,
  });

  const loadAllFilteredLogs = async () => {
    const rows = [];
    let exportPage = 1;
    let totalPages = 1;

    do {
      const response = await logAPI.list({
        ...exportFilters(),
        page: exportPage,
        limit: EXPORT_PAGE_SIZE,
      });
      rows.push(...(response.data || []));
      totalPages = Math.max(Number(response.totalPages || 1), 1);
      exportPage += 1;
    } while (exportPage <= totalPages);

    return rows;
  };

  const handleExcelExport = async () => {
    try {
      setExportBusy("excel");
      const rows = await loadAllFilteredLogs();
      if (!rows.length) {
        toast.error(t("admin.noLogs"));
        return;
      }
      exportTableExcel({
        title: t("admin.logsTitle"),
        columns: getLogExportColumns(t),
        rows,
        filename: `application-logs-${new Date().toISOString().slice(0, 10)}.xls`,
      });
      toast.success(t("shared.actionCompleted"));
    } catch (error) {
      toast.error(t("shared.actionFailed"));
    } finally {
      setExportBusy("");
    }
  };

  const handlePrint = async () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error(t("shared.actionFailed"));
      return;
    }

    try {
      setExportBusy("print");
      printWindow.document.write("<p>Preparing logs for print...</p>");
      const rows = await loadAllFilteredLogs();
      if (!rows.length) {
        printWindow.close();
        toast.error(t("admin.noLogs"));
        return;
      }
      printTable({
        title: t("admin.logsTitle"),
        columns: getLogExportColumns(t),
        rows,
        filters: exportFilters(),
        printWindow,
      });
    } catch (error) {
      printWindow.close();
      toast.error(t("shared.actionFailed"));
    } finally {
      setExportBusy("");
    }
  };

  return (
    <div className="space-y-7 pb-10">
      <PageHeader
        eyebrow={t("layout.systemLogs")}
        title={t("admin.logsTitle")}
        description={t("admin.logsDescription")}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(exportBusy)}
              onClick={handlePrint}
              className="inline-flex items-center gap-2"
            >
              <Printer size={17} />
              {exportBusy === "print" ? t("shared.processing") : t("shared.print")}
            </Button>
            <Button
              type="button"
              disabled={Boolean(exportBusy)}
              onClick={handleExcelExport}
              className="inline-flex items-center gap-2"
            >
              <FileSpreadsheet size={17} />
              {exportBusy === "excel" ? t("shared.processing") : t("shared.exportExcel")}
            </Button>
          </div>
        )}
      />

      <section className={`rounded-3xl border p-6 ${
        loggingEnabled
          ? "border-green-200 bg-green-50/60"
          : "border-amber-200 bg-amber-50/60"
      }`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${
              loggingEnabled ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}>
              {loggingEnabled ? <ShieldCheck size={24} /> : <ShieldOff size={24} />}
            </span>
            <div>
              <h2 className="font-heading text-2xl text-vineyard">
                {loggingEnabled ? t("statuses.logs.enabled") : t("statuses.logs.disabled")}
              </h2>
              <p className="mt-1 text-sm text-mutedText">
                {loggingEnabled
                  ? "New audit and application events are being saved."
                  : "New events are not persisted; critical errors may still appear in the server console."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={loggingEnabled ? "outline" : "primary"}
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate(!loggingEnabled)}
          >
            {statusMutation.isPending
              ? t("shared.processing")
              : loggingEnabled ? t("admin.disableLogs") : t("admin.enableLogs")}
          </Button>
        </div>
      </section>

      <section className="section-card grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-[34px] text-mutedText" size={17} />
          <InputField
            label={t("admin.searchLogs")}
            value={filters.search}
            onChange={(event) => setFilter("search", event.target.value)}
            placeholder={t("admin.searchLogs")}
            className="[&_input]:pl-9"
          />
        </div>
        <InputField
          label={t("shared.date")}
          type="date"
          value={filters.date}
          onChange={(event) => setFilter("date", event.target.value)}
        />
        <SelectField
          label={t("admin.level")}
          value={filters.level}
          onChange={(event) => setFilter("level", event.target.value)}
          options={LEVELS.map((value) => ({
            value,
            label: value ? t(`ops.${value}`) : t("ops.allLevels"),
          }))}
        />
        <SelectField
          label={t("admin.module")}
          value={filters.module}
          onChange={(event) => setFilter("module", event.target.value)}
          options={[
            { label: t("shared.all"), value: "" },
            ...modules.map((module) => ({ label: module, value: module })),
          ]}
        />
      </section>

      <section className="section-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-divider p-5">
          <Database size={20} className="text-saffron" />
          <h2 className="font-heading text-xl text-vineyard">{t("admin.savedLogs")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1750px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-mutedText">
              <tr>
                <th className="px-5 py-3">{t("exports.timeIst")}</th>
                <th className="px-5 py-3">{t("admin.storedUtc")}</th>
                <th className="px-5 py-3">{t("admin.level")}</th>
                <th className="px-5 py-3">{t("admin.module")}</th>
                <th className="px-5 py-3">{t("admin.action")}</th>
                <th className="px-5 py-3">{t("admin.message")}</th>
                <th className="px-5 py-3">{t("admin.userRole")}</th>
                <th className="px-5 py-3">{t("admin.entity")}</th>
                <th className="px-5 py-3">{t("admin.ipUserAgent")}</th>
                <th className="px-5 py-3">{t("admin.change")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-divider align-top">
                  <td className="whitespace-nowrap px-5 py-4 text-xs">{log.timestamp_ist || formatTimestamp(log.created_at)}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-[10px]">{log.timestamp_utc || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                      LEVEL_STYLES[log.level] || LEVEL_STYLES.info
                    }`}>
                      {log.level || "info"}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold capitalize">{log.module || "system"}</td>
                  <td className="max-w-56 break-words px-5 py-4 font-medium">{log.action}</td>
                  <td className="max-w-80 break-words px-5 py-4 text-mutedText">{log.message || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs">
                    <span className="font-semibold">{log.actor_name || log.actor_email || "System"}</span>
                    <br />
                    {log.actor_role || "system"}{log.actor_id ? ` #${log.actor_id}` : ""}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs">
                    {log.entity_type || "system"}{log.entity_id ? ` #${log.entity_id}` : ""}
                  </td>
                  <td className="max-w-72 break-words px-5 py-4 text-xs">
                    {log.ip_address || "—"}
                    <br />
                    <span className="text-mutedText">{log.user_agent || "—"}</span>
                  </td>
                  <td className="max-w-80 break-words px-5 py-4 font-mono text-[10px]">
                    <span className="text-red-700">{t("admin.oldValue")}: {formatAuditValue(log.old_value) || "—"}</span>
                    <br />
                    <span className="text-green-700">{t("admin.newValue")}: {formatAuditValue(log.new_value) || "—"}</span>
                  </td>
                </tr>
              ))}
              {!isLoading && !logs.length ? (
                <tr>
                  <td colSpan="10" className="px-5 py-12 text-center text-mutedText">
                    {t("admin.noLogs")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {isLoading ? <p className="p-8 text-center text-mutedText">{t("common.loading")}</p> : null}
        <div className="border-t border-divider p-4">
          <PaginationControls
            page={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      </section>
    </div>
  );
}
