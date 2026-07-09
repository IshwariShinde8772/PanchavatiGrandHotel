import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { offerAPI } from "../../api/offerAPI";
import { exportTableExcel, exportTablePdf } from "../../utils/exportReports";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "../../utils/paginationMeta";

const CATEGORIES = ["All", "Standard", "Deluxe", "Regular"];

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function Offers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    title: "",
    description: "",
    discount_pct: "",
    start_date: "",
    end_date: "",
    room_category: "All",
  });

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-offers", page],
    queryFn: () => offerAPI.list({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  const items = res?.data || [];
  const pagination = getPaginationMeta(res, items.length);

  const createMutation = useMutation({
    mutationFn: offerAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-offers"]);
      toast.success(t("ops.created"));
      setModalOpen(false);
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => offerAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-offers"]);
      toast.success(t("ops.updated"));
      setModalOpen(false);
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: offerAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-offers"]);
      toast.success(t("ops.deleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const openAdd = () => {
    setEditingItem(null);
    setForm({ title: "", description: "", discount_pct: "", start_date: "", end_date: "", room_category: "All" });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description,
      discount_pct: item.discount_pct,
      start_date: item.start_date,
      end_date: item.end_date,
      room_category: item.room_category,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this offer?")) {
      deleteMutation.mutate(id);
    }
  };

  const exportColumns = [
    { header: "Title", value: (row) => row.title },
    { header: "Category", value: (row) => row.room_category },
    { header: "Discount %", value: (row) => row.discount_pct },
    { header: "Start Date", value: (row) => row.start_date },
    { header: "End Date", value: (row) => row.end_date },
    { header: "Status", value: (row) => row.is_active ? "Active" : "Expired/Inactive" },
  ];

  const exportOffers = async (format) => {
    const response = await offerAPI.list({ page: 1, limit: 1000 });
    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      title: "Offers List",
      columns: exportColumns,
      rows: response?.data || [],
      filename: `offers-list-${date}.${format === "pdf" ? "pdf" : "xlsx"}`,
    };
    format === "pdf" ? exportTablePdf(payload) : exportTableExcel(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow={t("layout.offers")}
        title={t("ops.offersTitle")}
        description={t("ops.offersDescription")}
        actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => exportOffers("excel")}>{t("shared.exportExcel")}</Button><Button variant="outline" onClick={() => exportOffers("pdf")}>{t("shared.exportPdf")}</Button><Button onClick={openAdd}>+ {t("ops.createOffer")}</Button></div>}
      />

      {isLoading ? (
        <p className="p-6 text-mutedText">{t("ops.loadingOffers")}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="section-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold font-heading">{item.title}</h3>
                  <span className="rounded-full bg-goldLight px-3 py-1 text-xs font-bold text-vineyard">
                    {item.discount_pct}% OFF
                  </span>
                </div>
                <p className="text-sm text-mutedText mb-4">{item.description}</p>
                <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-mutedText">
                  <span>Category: {item.room_category}</span>
                  <span>•</span>
                  <span>Until {item.end_date}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button className="flex-1" variant="outline" size="sm" onClick={() => openEdit(item)}>{t("shared.edit")}</Button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg bg-maroon px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 flex-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="md:col-span-2 section-card p-10 text-center text-mutedText">
              No active offers found. Create one to get started!
            </div>
          )}
          <div className="md:col-span-2"><PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} /></div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
            <h3 className="mb-6 text-2xl font-bold font-heading">
              {editingItem ? "Update Offer" : "Create New Offer"}
            </h3>
            <div className="space-y-5">
              <InputField label={t("ops.offerTitle")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div className="space-y-1">
                <label className="block text-sm font-bold text-vineyard">{t("ops.description")}</label>
                <textarea 
                  className="w-full rounded-xl border-2 border-divider p-3 text-sm focus:border-vineyard outline-none"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label={t("ops.discountPercent")} type="number" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} />
                <SelectField 
                  label={t("ops.roomCategory")}
                  value={form.room_category} 
                  onChange={(e) => setForm({ ...form, room_category: e.target.value })}
                  options={CATEGORIES.map(c => ({ label: c, value: c }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label={t("ops.validFrom")} type="date" min={todayDateInput()} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value, end_date: form.end_date && new Date(form.end_date) < new Date(e.target.value) ? "" : form.end_date })} />
                <InputField label={t("ops.validUntil")} type="date" min={form.start_date || todayDateInput()} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Processing..." : "Confirm Offer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
