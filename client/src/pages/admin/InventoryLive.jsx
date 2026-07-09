import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { inventoryAPI } from "../../api/inventoryAPI";

const CATEGORIES = [
  { label: "Linen", value: "linen" },
  { label: "Toiletries", value: "toiletries" },
  { label: "Food", value: "food" },
  { label: "Cleaning", value: "cleaning" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Beverage", value: "beverage" },
];

const EMPTY_FORM = {
  item_name: "",
  category: "linen",
  quantity: "",
  unit: "pcs",
  reorder_level: "10",
  supplier: "",
  cost_per_unit: "",
};

export default function InventoryLive() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: inventoryAPI.list,
  });

  const items = (res?.data || []).filter((item) => filterCat === "all" || item.category === filterCat);
  const lowStock = (res?.data || []).filter((item) => item.low_stock || item.quantity <= item.reorder_level);

  const createMutation = useMutation({
    mutationFn: inventoryAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      toast.success(t("ops.created"));
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => inventoryAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      toast.success(t("ops.updated"));
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: inventoryAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      toast.success(t("ops.deleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const openAdd = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      item_name: item.item_name || "",
      category: item.category || "linen",
      quantity: String(item.quantity ?? ""),
      unit: item.unit || "pcs",
      reorder_level: String(item.reorder_level ?? 10),
      supplier: item.supplier || "",
      cost_per_unit: item.cost_per_unit ? String(item.cost_per_unit) : "",
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.item_name.trim()) {
      toast.error(t("shared.required"));
      return;
    }

    const payload = {
      item_name: form.item_name.trim(),
      category: form.category,
      quantity: Number(form.quantity || 0),
      unit: form.unit.trim() || "pcs",
      reorder_level: Number(form.reorder_level || 10),
      supplier: form.supplier.trim() || null,
      cost_per_unit: form.cost_per_unit ? Number(form.cost_per_unit) : null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this inventory item?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("layout.inventory")}
        title={t("ops.inventoryTitle")}
        description={t("ops.inventoryDescription")}
        actions={<Button onClick={openAdd}>{t("ops.addItem")}</Button>}
      />

      {lowStock.length ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          {lowStock.length} item{lowStock.length > 1 ? "s are" : " is"} below reorder level.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {[{ label: "All", value: "all" }, ...CATEGORIES].map((category) => (
          <button
            key={category.value}
            type="button"
            onClick={() => setFilterCat(category.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filterCat === category.value
                ? "bg-vineyard text-white"
                : "border border-divider bg-white text-mutedText"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="p-6 text-mutedText">{t("ops.loadingInventoryItems")}</p>
      ) : (
        <div className="section-card divide-y divide-divider overflow-hidden">
          {items.map((item) => {
            const isLow = item.low_stock || item.quantity <= item.reorder_level;

            return (
              <div key={item.id} className="grid gap-4 p-5 md:grid-cols-[1.4fr_0.8fr_0.5fr_0.8fr_0.7fr_0.7fr_180px] md:items-center">
                <div>
                  <p className="font-semibold">{item.item_name}</p>
                  {item.supplier ? <p className="text-xs text-mutedText">{item.supplier}</p> : null}
                </div>
                <p className="text-sm font-semibold text-vineyard">{item.category_label || item.category}</p>
                <p className={`text-sm font-bold ${isLow ? "text-red-600" : "text-primary"}`}>{item.quantity}</p>
                <p className="text-sm text-mutedText">{item.unit}</p>
                <p className="text-sm text-mutedText">{item.reorder_level}</p>
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                  isLow ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                }`}>
                  {isLow ? t("ops.lowStock") : t("ops.healthyStock")}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEdit(item)}>{t("shared.edit")}</Button>
                  <Button style={{ backgroundColor: "#DC2626", color: "white" }} onClick={() => handleDelete(item.id)}>
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            );
          })}
          {items.length === 0 ? <p className="p-6 text-center text-mutedText">{t("ops.noInventoryItems")}</p> : null}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-6 font-heading text-2xl">{editingItem ? `${t("shared.edit")} ${t("ops.inventoryItem")}` : `${t("shared.add")} ${t("ops.inventoryItem")}`}</h3>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <InputField
                  label={t("ops.itemName")}
                  value={form.item_name}
                  onChange={(event) => setForm((current) => ({ ...current, item_name: event.target.value }))}
                />
              </div>
              <SelectField
                label={t("shared.category")}
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                options={CATEGORIES}
              />
              <InputField
                label={t("ops.unit")}
                value={form.unit}
                onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
              />
              <InputField
                label={t("ops.quantity")}
                type="number"
                value={form.quantity}
                onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
              />
              <InputField
                label={t("ops.reorderLevel")}
                type="number"
                value={form.reorder_level}
                onChange={(event) => setForm((current) => ({ ...current, reorder_level: event.target.value }))}
              />
              <InputField
                label={t("ops.supplier")}
                value={form.supplier}
                onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))}
              />
              <InputField
                label={t("ops.costPerUnit")}
                type="number"
                value={form.cost_per_unit}
                onChange={(event) => setForm((current) => ({ ...current, cost_per_unit: event.target.value }))}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? t("common.saving") : t("common.saveChanges")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
