import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { offerAPI } from "../../api/offerAPI";

const CATEGORIES = ["All", "Standard", "Deluxe", "Suite", "Family", "Presidential"];

export default function Offers() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    discount_pct: "",
    start_date: "",
    end_date: "",
    room_category: "All",
  });

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: offerAPI.list,
  });

  const items = res?.data || [];

  const createMutation = useMutation({
    mutationFn: offerAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-offers"]);
      toast.success("Offer created successfully");
      setModalOpen(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to create offer"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => offerAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-offers"]);
      toast.success("Offer updated successfully");
      setModalOpen(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to update offer"),
  });

  const deleteMutation = useMutation({
    mutationFn: offerAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-offers"]);
      toast.success("Offer deleted");
    },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to delete"),
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

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Special Offers" 
        title="Promotional discounts & packages" 
        description="Create limited-time offers to boost occupancy and reward loyal guests." 
        actions={<Button onClick={openAdd}>+ Create Offer</Button>}
      />

      {isLoading ? (
        <p className="p-6 text-mutedText">Loading offers...</p>
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
                <Button className="flex-1" variant="outline" size="sm" onClick={() => openEdit(item)}>Edit</Button>
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
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
            <h3 className="mb-6 text-2xl font-bold font-heading">
              {editingItem ? "Update Offer" : "Create New Offer"}
            </h3>
            <div className="space-y-5">
              <InputField label="Offer Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div className="space-y-1">
                <label className="block text-sm font-bold text-vineyard">Description</label>
                <textarea 
                  className="w-full rounded-xl border-2 border-divider p-3 text-sm focus:border-vineyard outline-none"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Discount %" type="number" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} />
                <SelectField 
                  label="Room Category" 
                  value={form.room_category} 
                  onChange={(e) => setForm({ ...form, room_category: e.target.value })}
                  options={CATEGORIES.map(c => ({ label: c, value: c }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Valid From" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                <InputField label="Valid Until" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
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
