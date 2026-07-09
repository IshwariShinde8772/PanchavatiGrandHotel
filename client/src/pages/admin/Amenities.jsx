import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Edit3, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { amenityAPI } from "../../api/amenityAPI";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import PageHeader from "../../components/common/PageHeader";
import SelectField from "../../components/forms/SelectField";

export const AMENITY_CATEGORIES = [
  "Comfort",
  "Entertainment",
  "Bathroom",
  "Food & Beverage",
  "Safety",
  "View",
  "Accessibility",
  "Other",
];

const EMPTY_FORM = {
  name: "",
  icon: "",
  category: "Other",
  status: "active",
};

export default function Amenities() {
  const { t } = useTranslation();
  const categoryLabel = (category) => {
    const keys = {
      Comfort: "comfort", Entertainment: "entertainment", Bathroom: "bathroom",
      "Food & Beverage": "foodBeverage", Safety: "safety", View: "viewCategory",
      Accessibility: "accessibility", Other: "other",
    };
    return t(`ops.${keys[category] || "other"}`);
  };
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-amenities", search, status],
    queryFn: () => amenityAPI.list({
      search: search || undefined,
      status: status || undefined,
    }),
  });
  const amenities = data?.data || [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-amenities"] });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAmenity(null);
    setForm(EMPTY_FORM);
  };

  const createMutation = useMutation({
    mutationFn: amenityAPI.create,
    onSuccess: () => {
      refresh();
      closeModal();
      toast.success(t("ops.created"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => amenityAPI.update(id, payload),
    onSuccess: () => {
      refresh();
      closeModal();
      toast.success(t("ops.updated"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: amenityAPI.remove,
    onSuccess: (response) => {
      refresh();
      toast.success(t("ops.deleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const openCreate = () => {
    setEditingAmenity(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (amenity) => {
    setEditingAmenity(amenity);
    setForm({
      name: amenity.name || "",
      icon: amenity.icon || "",
      category: amenity.category || "Other",
      status: amenity.status || "active",
    });
    setModalOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      toast.error(t("shared.required"));
      return;
    }

    const payload = {
      name: form.name.trim(),
      icon: form.icon.trim() || null,
      category: form.category,
      status: form.status,
    };

    if (editingAmenity) {
      updateMutation.mutate({ id: editingAmenity.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const remove = (amenity) => {
    if (window.confirm(t("shared.confirmDelete"))) {
      deleteMutation.mutate(amenity.id);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        eyebrow={t("ops.amenitiesEyebrow")}
        title={t("ops.amenitySuggestions")}
        description={t("ops.amenityDescription")}
        actions={<Button onClick={openCreate}><Plus size={17} /> {t("admin.addAmenity")}</Button>}
      />

      <div className="section-card p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-mutedText" size={18} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("ops.searchAmenities")}
              className="h-12 w-full rounded-2xl border border-divider bg-white pl-11 pr-4 outline-none focus:border-saffron"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-12 rounded-2xl border border-divider bg-white px-4 outline-none focus:border-saffron"
          >
            <option value="">{t("shared.allStatuses")}</option>
            <option value="active">{t("ops.active")}</option>
            <option value="inactive">{t("ops.inactive")}</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-mutedText">{t("ops.loadingAmenities")}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {amenities.map((amenity) => (
            <article key={amenity.id} className="section-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-saffronLight text-saffron">
                    <Sparkles size={18} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-heading text-xl text-vineyard">{amenity.name}</h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-mutedText">
                      {categoryLabel(amenity.category)}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                  amenity.status === "active"
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {amenity.status === "active" ? t("ops.active") : t("ops.inactive")}
                </span>
              </div>
              {amenity.icon ? (
                <p className="mt-4 text-xs text-mutedText">{t("ops.iconKey")}: {amenity.icon}</p>
              ) : null}
              <div className="mt-5 flex gap-2 border-t border-divider pt-4">
                <button
                  type="button"
                  onClick={() => openEdit(amenity)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-divider px-4 py-2 text-sm font-bold text-vineyard hover:bg-gray-50"
                >
                  <Edit3 size={15} /> {t("shared.edit")}
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => remove(amenity)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 size={15} /> {t("common.delete")}
                </button>
              </div>
            </article>
          ))}
          {!amenities.length ? (
            <div className="section-card p-10 text-center text-mutedText md:col-span-2 xl:col-span-3">
              {t("ops.noAmenitiesMatch")}
            </div>
          ) : null}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-vineyard/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-[30px] bg-white p-7 shadow-2xl md:p-10">
            <button type="button" onClick={closeModal} className="absolute right-5 top-5 rounded-full p-2 hover:bg-gray-100">
              <X size={22} />
            </button>
            <h2 className="font-heading text-3xl text-vineyard">
              {editingAmenity ? `${t("shared.edit")} ${t("layout.amenities")}` : t("admin.addAmenity")}
            </h2>
            <div className="mt-7 grid gap-5">
              <InputField
                label={t("ops.amenityName")}
                placeholder="e.g. Wi-Fi"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label={t("shared.category")}
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  options={AMENITY_CATEGORIES.map((category) => ({ label: categoryLabel(category), value: category }))}
                />
                <SelectField
                  label={t("common.status")}
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                  options={[
                    { label: t("ops.active"), value: "active" },
                    { label: t("ops.inactive"), value: "inactive" },
                  ]}
                />
              </div>
              <InputField
                label={t("ops.iconKeyOptional")}
                placeholder="e.g. wifi"
                value={form.icon}
                onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
              />
            </div>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
              <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>{t("common.cancel")}</Button>
              <Button type="button" className="flex-1" disabled={isSaving} onClick={save}>
                {isSaving ? t("common.saving") : editingAmenity ? t("common.saveChanges") : t("admin.addAmenity")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
