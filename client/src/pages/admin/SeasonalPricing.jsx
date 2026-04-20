import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { seasonalAPI } from "../../api/seasonalAPI";

const CATEGORIES = ["Standard", "Deluxe", "Suite", "Family", "Presidential"];

export default function SeasonalPricing() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category: "Standard",
    seasonal_price: "",
    start_date: "",
    end_date: "",
  });

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-seasonal-pricing"],
    queryFn: seasonalAPI.list,
  });

  const items = res?.data || [];

  const createMutation = useMutation({
    mutationFn: seasonalAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-seasonal-pricing"]);
      toast.success("Seasonal price added");
      setModalOpen(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to add seasonal price"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => seasonalAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-seasonal-pricing"]);
      toast.success("Seasonal price updated");
      setModalOpen(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: seasonalAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-seasonal-pricing"]);
      toast.success("Seasonal price deleted");
    },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to delete"),
  });

  const openAdd = () => {
    setEditingItem(null);
    setForm({ name: "", category: "Standard", seasonal_price: "", start_date: "", end_date: "" });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      seasonal_price: item.seasonal_price,
      start_date: item.start_date,
      end_date: item.end_date,
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
    if (window.confirm("Delete this seasonal price?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Seasonal Pricing" 
        title="Peak-season rate windows" 
        description="Define Kumbh, vineyard, festival, and holiday pricing by room category." 
        actions={<Button onClick={openAdd}>+ Add New</Button>}
      />
      
      {isLoading ? (
        <p className="p-6 text-mutedText">Loading seasonal prices...</p>
      ) : (
        <div className="section-card divide-y divide-divider overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="grid items-center gap-3 p-5 md:grid-cols-5">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-mutedText">{item.category}</p>
              </div>
              <p className="text-sm">{item.start_date} to {item.end_date}</p>
              <p className="font-bold text-vineyard">₹{item.seasonal_price}</p>
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(item)}>Edit</Button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg bg-maroon px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="p-10 text-center text-mutedText">No seasonal pricing rules defined.</p>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-bold">{editingItem ? "Edit Seasonal Price" : "Add New Seasonal Price"}</h3>
            <div className="space-y-4">
              <InputField label="Name (e.g. Kumbh Mela)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <SelectField 
                label="Room Category" 
                value={form.category} 
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                options={CATEGORIES.map(c => ({ label: c, value: c }))}
              />
              <InputField label="Seasonal Price" type="number" value={form.seasonal_price} onChange={(e) => setForm({ ...form, seasonal_price: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                <InputField label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
