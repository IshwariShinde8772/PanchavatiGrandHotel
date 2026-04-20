import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload, X, Trash2, Edit3, Image as ImageIcon } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { roomAPI } from "../../api/roomAPI";

const EMPTY_FORM = {
  room_number: "",
  name: "",
  category: "Standard",
  floor: "1",
  view_type: "City View",
  base_price: "",
  capacity: "2",
  description: "",
  imageInput: "",
  images: [],
  discount_pct: "",
  discount_end: "",
};

export default function ManageRooms() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: roomsResponse, isLoading } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: () => roomAPI.listAdminRooms(),
  });

  const rooms = roomsResponse?.data || [];

  const refreshRooms = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
  };

  const createMutation = useMutation({
    mutationFn: roomAPI.createRoom,
    onSuccess: () => {
      refreshRooms();
      toast.success("Room created successfully");
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to create room"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => roomAPI.updateRoom(id, payload),
    onSuccess: () => {
      refreshRooms();
      toast.success("Room updated successfully");
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to update room"),
  });

  const deleteMutation = useMutation({
    mutationFn: roomAPI.deleteRoom,
    onSuccess: () => {
      refreshRooms();
      toast.success("Room deleted successfully");
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to delete room"),
  });

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    // Validate files before uploading
    const validFiles = [];
    const invalidFiles = [];
    
    for (const file of files) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(`${file.name} (too large - max 5MB)`);
        continue;
      }
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        invalidFiles.push(`${file.name} (invalid format - use JPEG/PNG/WebP)`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (invalidFiles.length > 0) {
      toast.error(`Invalid files: ${invalidFiles.join(", ")}`);
    }
    
    if (!validFiles.length) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      const failedFiles = [];

      for (const file of validFiles) {
        try {
          console.log(`📤 Uploading: ${file.name} (${(file.size / 1024).toFixed(2)}KB, Type: ${file.type})`);
          const response = await roomAPI.uploadImage(file);
          
          if (response.success && response.data?.url) {
            uploadedUrls.push(response.data.url);
            console.log(`✅ Upload successful: ${response.data.url}`);
          } else {
            failedFiles.push(`${file.name} (no URL in response)`);
            console.error(`❌ No URL returned for ${file.name}:`, response);
          }
        } catch (error) {
          const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || "Unknown error";
          failedFiles.push(`${file.name} (${errorMsg})`);
          console.error(`❌ Upload error for ${file.name}:`, errorMsg);
        }
      }

      if (uploadedUrls.length > 0) {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls],
        }));
        toast.success(`✅ ${uploadedUrls.length} image${uploadedUrls.length > 1 ? "s" : ""} uploaded successfully`);
      }

      if (failedFiles.length > 0) {
        toast.error(`⚠️ Failed to upload: ${failedFiles.join(" | ")}`);
      }
    } catch (error) {
      console.error("❌ Upload batch error:", error);
      toast.error(error.response?.data?.error || error.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const addImageUrl = () => {
    const imageUrl = form.imageInput.trim();
    if (!imageUrl) return;

    setForm((prev) => ({
      ...prev,
      images: [...prev.images, imageUrl],
      imageInput: "",
    }));
  };

  const removeImage = (indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this room?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setForm({
      room_number: room.room_number || "",
      name: room.name || "",
      category: room.category || "Standard",
      floor: room.floor ? String(room.floor) : "",
      view_type: room.view_type || "",
      base_price: room.base_price ? String(room.base_price) : "",
      capacity: room.capacity ? String(room.capacity) : "",
      description: room.description || "",
      imageInput: "",
      images: room.images || [],
      discount_pct: room.discount_pct ? String(room.discount_pct) : "",
      discount_end: room.discount_end || "",
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.room_number.trim() || !form.name.trim() || !form.base_price || !form.capacity) {
      toast.error("Please fill in room number, name, price, and capacity.");
      return;
    }

    if (form.description.trim().length < 10) {
      toast.error("Please add a longer room description.");
      return;
    }

    const payload = {
      room_number: form.room_number.trim(),
      name: form.name.trim(),
      category: form.category,
      floor: form.floor || null,
      view_type: form.view_type || null,
      base_price: form.base_price,
      capacity: form.capacity,
      description: form.description.trim(),
      images: form.images,
      discount_pct: form.discount_pct || null,
      discount_end: form.discount_end || null,
      discount_start: form.discount_pct && form.discount_end ? new Date().toISOString().slice(0, 10) : null,
    };

    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Inventory Hub"
        title="Room Fleet Management"
        description="Configure room specs, pricing, and visual assets."
        actions={<Button onClick={handleOpenAdd} className="bg-vineyard text-white">Add New Room</Button>}
      />

      {isLoading ? (
        <div className="p-10 text-center text-mutedText italic">Fetching latest inventory...</div>
      ) : (
        <div className="grid gap-4 md:gap-6">
          {rooms.map((room) => {
            const isOfferActive = room.discount_pct && room.discount_end && new Date(room.discount_end) >= new Date();
            const displayImg = room.images?.[0] || "/assets/images/placeholder-room.svg";

            return (
              <div key={room.id} className="section-card p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-full md:w-32 h-32 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={displayImg} alt={room.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-black text-vineyard text-lg">{room.room_number} • {room.name}</p>
                    {isOfferActive && (
                      <span className="rounded-full bg-saffron/10 px-2 py-0.5 text-[10px] font-black text-saffron uppercase">
                        {room.discount_pct}% Discount
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-mutedText uppercase tracking-widest">{room.category} • Floor {room.floor || "-"} • {room.view_type || "No view set"}</p>
                  <p className="mt-2 font-black text-vineyard">₹{room.base_price} <span className="text-[10px] font-bold text-mutedText uppercase">/ Night</span></p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => handleOpenEdit(room)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-divider text-mutedText px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50">
                    <Edit3 size={16} /> Edit
                  </button>
                  <button onClick={() => handleDelete(room.id)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100">
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
          {rooms.length === 0 ? <p className="p-10 text-center text-mutedText italic border-2 border-dashed border-divider rounded-2xl">No rooms in inventory. Start by adding one.</p> : null}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-vineyard/40 backdrop-blur-sm p-4 overflow-hidden">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white p-8 md:p-12 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setModalOpen(false)} className="absolute right-6 top-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X size={24} className="text-mutedText" />
            </button>
            <h3 className="mb-8 font-heading text-3xl font-black text-vineyard">{editingRoom ? "Refine Room Details" : "Launch New Room"}</h3>

            <div className="space-y-8">
              <section className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">Basic Specifications</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <InputField label="Room Number *" placeholder="e.g. 101" value={form.room_number} onChange={(e) => setForm((prev) => ({ ...prev, room_number: e.target.value }))} />
                  <InputField label="Display Name *" placeholder="e.g. Garden View Suite" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                  <SelectField
                    label="Category"
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    options={[
                      { label: "Standard", value: "Standard" },
                      { label: "Deluxe", value: "Deluxe" },
                      { label: "Suite", value: "Suite" },
                      { label: "Family", value: "Family" },
                      { label: "Presidential", value: "Presidential" },
                    ]}
                  />
                  <InputField label="Max Capacity *" type="number" value={form.capacity} onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))} />
                </div>
              </section>

              <section className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">Location & Rates</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <InputField label="Floor" type="number" value={form.floor} onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))} />
                  <InputField label="View Type" placeholder="e.g. Mountain View" value={form.view_type} onChange={(e) => setForm((prev) => ({ ...prev, view_type: e.target.value }))} />
                  <div className="md:col-span-2">
                    <InputField label="Base Price (Per Night ₹) *" type="number" value={form.base_price} onChange={(e) => setForm((prev) => ({ ...prev, base_price: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">Description *</span>
                      <textarea className="min-h-28 w-full rounded-[24px] border border-divider px-4 py-3" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                    </label>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">Room Images</p>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-[1fr_auto_auto] gap-4 items-end">
                    <InputField label="Add Image URL" placeholder="https://..." value={form.imageInput} onChange={(e) => setForm((prev) => ({ ...prev, imageInput: e.target.value }))} />
                    <Button type="button" variant="outline" onClick={addImageUrl}>Add URL</Button>
                    <div className="relative">
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" multiple />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-11 px-6 bg-goldLight text-vineyard rounded-xl font-bold flex items-center gap-2 hover:bg-goldLight/80 transition-colors disabled:opacity-50"
                      >
                        <Upload size={18} /> {uploading ? "Uploading..." : "Upload Files"}
                      </button>
                    </div>
                  </div>
                  {form.images.length ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {form.images.map((image, index) => (
                        <ImagePreview key={`${image}-${index}`} image={image} index={index} onRemove={removeImage} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border-2 border-dashed border-divider p-8 text-center text-mutedText">
                      <ImageIcon size={28} className="mx-auto mb-3 opacity-60" />
                      No room images added yet.
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">Promotional Strategy</p>
                <div className="bg-gray-50 p-6 rounded-2xl space-y-4 border border-divider">
                  <div className="grid md:grid-cols-2 gap-6">
                    <InputField label="Discount %" type="number" max="100" value={form.discount_pct} onChange={(e) => setForm((prev) => ({ ...prev, discount_pct: e.target.value }))} />
                    <InputField label="Offer Valid Until" type="date" value={form.discount_end} onChange={(e) => setForm((prev) => ({ ...prev, discount_end: e.target.value }))} />
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-12 flex flex-col md:flex-row gap-4">
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending || uploading}
                className="flex-1 bg-vineyard text-white py-4 rounded-2xl font-black text-lg hover:opacity-90 transition-opacity shadow-xl disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Finalize & Save"}
              </button>
              <button onClick={() => setModalOpen(false)} className="py-4 px-8 text-mutedText font-bold hover:text-vineyard transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Helper component to display image with loading and error handling
function ImagePreview({ image, index, onRemove }) {
  const [imageState, setImageState] = useState("loading"); // loading, loaded, error

  return (
    <div className="relative w-full h-40 rounded-2xl overflow-hidden border-2 border-divider group bg-gray-50">
      {imageState === "loading" && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-spin">
            <div className="h-6 w-6 border-3 border-divider border-t-vineyard rounded-full" />
          </div>
        </div>
      )}
      
      <img
        src={image}
        alt={`Room ${index + 1}`}
        className={`w-full h-full object-cover transition-opacity ${
          imageState === "loaded" ? "opacity-100" : "opacity-0 absolute"
        }`}
        onLoad={() => {
          setImageState("loaded");
          console.log(`✅ Image loaded: ${image}`);
        }}
        onError={() => {
          setImageState("error");
          console.error(`❌ Image failed to load: ${image}`);
        }}
      />

      {imageState === "error" && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
          <ImageIcon size={24} className="text-red-400 mb-2" />
          <p className="text-[10px] text-red-600 text-center px-2">Image failed to load</p>
        </div>
      )}

      <button
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 bg-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
      >
        <X size={16} className="text-red-500" />
      </button>
    </div>
  );
}

/*
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import axios from "axios";
import { Upload, X, Trash2, Edit3, Image as ImageIcon } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { roomAPI } from "../../api/roomAPI";

export default function ManageRooms() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: roomsResponse, isLoading } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: () => roomAPI.listAdminRooms(),
  });

  const rooms = roomsResponse?.data || [];

  const [form, setForm] = useState({
    room_number: "",
    name: "",
    category: "Standard",
    floor: "1",
    view_type: "City View",
    base_price: "",
    capacity: "2",
    description: "",
    imageURL: "",
    discount_pct: "",
    discount_end: ""
  });

  const createMutation = useMutation({
    mutationFn: roomAPI.createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-rooms"]);
      toast.success("Room created successfully");
      setModalOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to create room")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => roomAPI.updateRoom(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-rooms"]);
      toast.success("Room updated successfully");
      setModalOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to update room")
  });

  const deleteMutation = useMutation({
    mutationFn: roomAPI.deleteRoom,
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-rooms"]);
      toast.success("Room deleted successfully");
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to delete room")
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/upload/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });
      setForm({ ...form, imageURL: response.data.data.url });
      toast.success("Image uploaded successfully");
    } catch (err) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this room?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setForm({ 
      room_number: "", name: "", category: "Standard", floor: "1", 
      view_type: "City View", base_price: "", capacity: "2",
      description: "", imageURL: "", discount_pct: "", discount_end: ""
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setForm({ 
      room_number: room.room_number, 
      name: room.name, 
      category: room.category, 
      floor: room.floor, 
      view_type: room.view_type, 
      base_price: room.base_price,
      capacity: room.capacity,
      description: room.description || "",
      imageURL: room.images?.[0] || "",
      discount_pct: room.discount_pct || "",
      discount_end: room.discount_end || ""
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.room_number || !form.name || !form.base_price) {
      toast.error("Please fill in mandatory fields.");
      return;
    }

    const payload = { 
      ...form, 
      images: [form.imageURL || "/assets/images/Rooms/Room1.jpg"],
      discount_pct: form.discount_pct || null,
      discount_end: form.discount_end || null,
      discount_start: form.discount_pct ? new Date().toISOString().split('T')[0] : null 
    };
    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <PageHeader 
        eyebrow="Inventory Hub" 
        title="Room Fleet Management" 
        description="Configure room specs, pricing, and visual assets." 
        actions={<Button onClick={handleOpenAdd} className="bg-vineyard text-white">Add New Room</Button>} 
      />
      
      {isLoading ? (
        <div className="p-10 text-center text-mutedText italic">Fetching latest inventory...</div>
      ) : (
        <div className="grid gap-4 md:gap-6">
          {rooms.map((room) => {
            const isOfferActive = room.discount_pct && room.discount_end && new Date(room.discount_end) >= new Date();
            const displayImg = room.images?.[0]?.includes('placeholder') ? '/assets/images/Rooms/Room1.jpg' : room.images?.[0];

            return (
              <div key={room.id} className="section-card p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-full md:w-32 h-32 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={displayImg} alt={room.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-black text-vineyard text-lg">{room.room_number} • {room.name}</p>
                    {isOfferActive && (
                      <span className="rounded-full bg-saffron/10 px-2 py-0.5 text-[10px] font-black text-saffron uppercase">
                        {room.discount_pct}% Discount
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-mutedText uppercase tracking-widest">{room.category} • Floor {room.floor} • {room.view_type}</p>
                  <p className="mt-2 font-black text-vineyard">₹{room.base_price} <span className="text-[10px] font-bold text-mutedText uppercase">/ Night</span></p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => handleOpenEdit(room)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-divider text-mutedText px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50">
                    <Edit3 size={16} /> Edit
                  </button>
                  <button onClick={() => handleDelete(room.id)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100">
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
          {rooms.length === 0 && <p className="p-10 text-center text-mutedText italic border-2 border-dashed border-divider rounded-2xl">No rooms in inventory. Start by adding one.</p>}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-vineyard/40 backdrop-blur-sm p-4 overflow-hidden">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white p-8 md:p-12 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setModalOpen(false)} className="absolute right-6 top-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X size={24} className="text-mutedText" />
            </button>
            <h3 className="mb-8 font-heading text-3xl font-black text-vineyard">{editingRoom ? "Refine Room Details" : "Launch New Room"}</h3>
            
            <div className="space-y-8">
              <section className="space-y-4">
                 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">Basic Specifications</p>
                 <div className="grid md:grid-cols-2 gap-6">
                    <InputField label="Room Number *" placeholder="e.g. 101" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} />
                    <InputField label="Display Name *" placeholder="e.g. Garden View Suite" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <SelectField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={[
                      { label: "Standard", value: "Standard" }, { label: "Deluxe", value: "Deluxe" }, { label: "Family", value: "Family" }, { label: "Presidential", value: "Presidential" }
                    ]} />
                    <InputField label="Max Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                 </div>
              </section>

              <section className="space-y-4">
                 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">Location & Rates</p>
                 <div className="grid md:grid-cols-2 gap-6">
                    <InputField label="Floor" type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
                    <InputField label="View Type" placeholder="e.g. Mountain View" value={form.view_type} onChange={(e) => setForm({ ...form, view_type: e.target.value })} />
                    <div className="md:col-span-2">
                      <InputField label="Base Price (Per Night ₹) *" type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
                    </div>
                 </div>
              </section>

              <section className="space-y-4">
                 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">Multimedia Assets</p>
                 <div className="space-y-4">
                    <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
                       <InputField label="Primary Image URL" placeholder="https://..." value={form.imageURL} onChange={(e) => setForm({ ...form, imageURL: e.target.value })} />
                       <div className="relative">
                          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                          <button 
                            type="button"
                            disabled={uploading}
                            onClick={() => fileInputRef.current.click()}
                            className="h-11 px-6 bg-goldLight text-vineyard rounded-xl font-bold flex items-center gap-2 hover:bg-goldLight/80 transition-colors disabled:opacity-50"
                          >
                            <Upload size={18} /> {uploading ? "Uploading..." : "Upload local file"}
                          </button>
                       </div>
                    </div>
                    {form.imageURL && (
                      <div className="relative w-full h-40 rounded-2xl overflow-hidden border-2 border-divider group">
                        <img src={form.imageURL} alt="Preview" className="w-full h-full object-cover" />
                        <button onClick={() => setForm({...form, imageURL: ""})} className="absolute top-2 right-2 bg-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                           <X size={16} className="text-red-500" />
                        </button>
                      </div>
                    )}
                 </div>
              </section>

              <section className="space-y-4">
                 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">Promotional Strategy</p>
                 <div className="bg-gray-50 p-6 rounded-2xl space-y-4 border border-divider">
                    <div className="grid md:grid-cols-2 gap-6">
                      <InputField label="Discount %" type="number" max="100" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} />
                      <InputField label="Offer Valid Until" type="date" value={form.discount_end} onChange={(e) => setForm({ ...form, discount_end: e.target.value })} />
                    </div>
                 </div>
              </section>
            </div>

            <div className="mt-12 flex flex-col md:flex-row gap-4">
              <button 
                onClick={handleSave} 
                disabled={createMutation.isPending || updateMutation.isPending || uploading}
                className="flex-1 bg-vineyard text-white py-4 rounded-2xl font-black text-lg hover:opacity-90 transition-opacity shadow-xl disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending ? "Syncing with Cloud..." : "Finalize & Save"}
              </button>
              <button onClick={() => setModalOpen(false)} className="py-4 px-8 text-mutedText font-bold hover:text-vineyard transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
*/
