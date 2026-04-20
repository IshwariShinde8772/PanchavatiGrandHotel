import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { inventoryAPI } from "../../api/inventoryAPI";

const CATEGORIES = ["Linen", "Toiletries", "Food", "Cleaning", "Maintenance"];

const emptyForm = {
  name: "",
  category: "Linen",
  quantity: "",
  unit: "",
  reorder_level: "",
};

export default function Inventory() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterCat, setFilterCat] = useState("All");
  const [form, setForm] = useState(emptyForm);

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: () => inventoryAPI.list(),
  });

  const items = (res?.data || []).filter(
    (i) => filterCat === "All" || i.category === filterCat
  );

  const lowStock = (res?.data || []).filter((i) => i.low_stock || i.quantity <= i.reorder_level);

  const createMutation = useMutation({
    mutationFn: inventoryAPI.create,
    onSuccess: () => { queryClient.invalidateQueries(["admin-inventory"]); toast.success("Item added"); setModalOpen(false); },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to add item"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => inventoryAPI.update(id, payload),
    onSuccess: () => { queryClient.invalidateQueries(["admin-inventory"]); toast.success("Item updated"); setModalOpen(false); },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to update item"),
  });

  const deleteMutation = useMutation({
    mutationFn: inventoryAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries(["admin-inventory"]); toast.success("Item deleted"); },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to delete item"),
  });

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (item) => {
    setEditingItem(item);
    setForm({ name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, reorder_level: item.reorder_level });
    setModalOpen(true);
  };

  const handleSave = () => {
    const payload = { ...form, quantity: Number(form.quantity), reorder_level: Number(form.reorder_level) };
    if (editingItem) updateMutation.mutate({ id: editingItem.id, payload });
    else createMutation.mutate(payload);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this inventory item?")) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Track hotel stock and reorder alerts"
        description="Monitor linen, toiletries, food, beverage, and maintenance supplies."
        actions={<Button onClick={openAdd}>+ Add Item</Button>}
      />

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: "12px 16px" }}>
          <p style={{ color: "#C2410C", fontWeight: 600, fontSize: 14 }}>
            ⚠ {lowStock.length} item{lowStock.length > 1 ? "s" : ""} below reorder level: {lowStock.map((i) => i.name).join(", ")}
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: "2px solid",
              borderColor: filterCat === cat ? "#0A4D34" : "#D1D5DB",
              backgroundColor: filterCat === cat ? "#0A4D34" : "white",
              color: filterCat === cat ? "white" : "#374151",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p style={{ padding: 20, color: "#6B7280" }}>Loading inventory…</p>
      ) : (
        <div className="section-card overflow-hidden">
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 0.8fr 0.6fr 0.6fr 0.7fr 0.7fr 160px", gap: 12, padding: "10px 20px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
            {["ITEM", "CATEGORY", "QTY", "UNIT", "REORDER", "STATUS", "ACTIONS"].map((h) => (
              <p key={h} style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em" }}>{h}</p>
            ))}
          </div>
          {items.map((item) => {
            const isLow = item.low_stock || item.quantity <= item.reorder_level;
            return (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 0.8fr 0.6fr 0.6fr 0.7fr 0.7fr 160px",
                  gap: 12,
                  padding: "14px 20px",
                  borderBottom: "1px solid #F3F4F6",
                  alignItems: "center",
                  background: isLow ? "#FFFBEB" : "white",
                }}
              >
                <p style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</p>
                <p style={{ fontSize: 13, color: "#0A4D34", fontWeight: 600 }}>{item.category}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: isLow ? "#DC2626" : "#111827" }}>{item.quantity}</p>
                <p style={{ fontSize: 13, color: "#6B7280" }}>{item.unit}</p>
                <p style={{ fontSize: 13 }}>{item.reorder_level}</p>
                <span style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  background: isLow ? "#FEE2E2" : "#DCFCE7",
                  color: isLow ? "#DC2626" : "#16A34A",
                  width: "fit-content",
                }}>
                  {isLow ? "Low Stock" : "OK"}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => openEdit(item)}
                    style={{ padding: "5px 12px", borderRadius: 8, border: "1.5px solid #0A4D34", background: "white", color: "#0A4D34", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "#DC2626", color: "white", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p style={{ padding: 24, color: "#9CA3AF", textAlign: "center" }}>No inventory items found.</p>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{editingItem ? "Edit Item" : "Add Inventory Item"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <InputField label="Item Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <SelectField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <InputField label="Quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                <InputField label="Unit (e.g. pieces, kg)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <InputField label="Reorder Level" type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
