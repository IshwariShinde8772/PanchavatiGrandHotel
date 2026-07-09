import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Check, Plus, Search, Upload, X, Trash2, Edit3, Image as ImageIcon } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { roomAPI } from "../../api/roomAPI";
import { amenityAPI } from "../../api/amenityAPI";
import { exportTableExcel, exportTablePdf } from "../../utils/exportReports";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "../../utils/paginationMeta";
import { roomCategoryLabel, roomStatusLabel } from "../../utils/i18nLabels";

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
  amenity_ids: [],
  discount_pct: "",
  discount_end: "",
};

const IMAGE_EXTENSIONS = /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?.*)?(#.*)?$/i;
const TRUSTED_IMAGE_HOSTS = [
  "images.unsplash.com",
  "res.cloudinary.com",
  "firebasestorage.googleapis.com",
];

function isDirectImageUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    const hasValidProtocol = ["http:", "https:"].includes(parsed.protocol);
    const hasImageExtension =
      IMAGE_EXTENSIONS.test(parsed.pathname) ||
      IMAGE_EXTENSIONS.test(normalized);
    const isTrustedImageHost = TRUSTED_IMAGE_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );

    return hasValidProtocol && (hasImageExtension || isTrustedImageHost);
  } catch (error) {
    return false;
  }
}

export default function ManageRooms() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const [amenitySearch, setAmenitySearch] = useState("");
  const [newAmenityName, setNewAmenityName] = useState("");

  const { data: roomsResponse, isLoading } = useQuery({
    queryKey: ["admin-rooms", page],
    queryFn: () => roomAPI.listAdminRooms({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  const rooms = roomsResponse?.data || [];
  const pagination = getPaginationMeta(roomsResponse, rooms.length);

  const { data: amenitiesResponse } = useQuery({
    queryKey: ["admin-amenities", "active-room-form"],
    queryFn: () => amenityAPI.list({ status: "active" }),
  });
  const activeAmenities = amenitiesResponse?.data || [];
  const amenityOptionsById = new Map(
    activeAmenities.map((amenity) => [Number(amenity.id), amenity])
  );
  for (const amenity of editingRoom?.amenity_details || []) {
    if (form.amenity_ids.includes(Number(amenity.id))) {
      amenityOptionsById.set(Number(amenity.id), amenity);
    }
  }
  const amenityOptions = [...amenityOptionsById.values()];
  const visibleAmenityOptions = amenityOptions.filter((amenity) => (
    amenity.name.toLocaleLowerCase().includes(amenitySearch.trim().toLocaleLowerCase())
  ));
  const selectedAmenities = form.amenity_ids
    .map((id) => amenityOptionsById.get(Number(id)))
    .filter(Boolean);

  const refreshRooms = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
  };

  const createMutation = useMutation({
    mutationFn: roomAPI.createRoom,
    onSuccess: () => {
      refreshRooms();
      toast.success(t("ops.created"));
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => roomAPI.updateRoom(id, payload),
    onSuccess: () => {
      refreshRooms();
      toast.success(t("ops.updated"));
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: roomAPI.deleteRoom,
    onSuccess: () => {
      refreshRooms();
      toast.success(t("ops.deleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const inlineAmenityMutation = useMutation({
    mutationFn: (name) => amenityAPI.create({
      name,
      category: "Other",
      status: "active",
    }),
    onSuccess: (response) => {
      const amenity = response.data;
      queryClient.setQueryData(
        ["admin-amenities", "active-room-form"],
        (current) => ({
          ...(current || { success: true }),
          data: [...(current?.data || []), amenity],
          total: Number(current?.total || 0) + 1,
        })
      );
      queryClient.invalidateQueries({ queryKey: ["admin-amenities"] });
      setForm((prev) => ({
        ...prev,
        amenity_ids: [...new Set([...prev.amenity_ids, Number(amenity.id)])],
      }));
      setNewAmenityName("");
      toast.success(t("shared.actionCompleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
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
      toast.error(t("shared.actionFailed"));
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

    if (!isDirectImageUrl(imageUrl)) {
      toast.error(t("shared.actionFailed"));
      return;
    }

    if (form.images.includes(imageUrl)) {
      toast.error(t("shared.actionFailed"));
      return;
    }

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
    if (window.confirm(t("shared.confirmDelete"))) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setForm(EMPTY_FORM);
    setAmenitySearch("");
    setNewAmenityName("");
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
      amenity_ids: (room.amenity_details || []).map((amenity) => Number(amenity.id)),
      discount_pct: room.discount_pct ? String(room.discount_pct) : "",
      discount_end: room.discount_end || "",
    });
    setAmenitySearch("");
    setNewAmenityName("");
    setModalOpen(true);
  };

  const toggleAmenity = (amenity) => {
    const id = Number(amenity.id);
    const isSelected = form.amenity_ids.includes(id);
    if (amenity.status === "inactive" && !isSelected) return;

    setForm((prev) => ({
      ...prev,
      amenity_ids: isSelected
        ? prev.amenity_ids.filter((amenityId) => amenityId !== id)
        : [...prev.amenity_ids, id],
    }));
  };

  const addInlineAmenity = () => {
    const name = newAmenityName.trim();
    if (!name) {
      toast.error(t("shared.required"));
      return;
    }
    inlineAmenityMutation.mutate(name);
  };

  const handleSave = () => {
    if (!form.room_number.trim() || !form.name.trim() || !form.base_price || !form.capacity) {
      toast.error(t("ops.completeFields"));
      return;
    }

    if (form.description.trim().length < 10) {
      toast.error(t("shared.required"));
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
      amenity_ids: form.amenity_ids,
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

  const exportColumns = [
    { header: t("shared.roomNumber"), value: (row) => row.room_number },
    { header: t("shared.name"), value: (row) => row.name },
    { header: t("shared.category"), value: (row) => roomCategoryLabel(t, row.category) },
    { header: t("common.floor"), value: (row) => row.floor },
    { header: t("ops.maxCapacity"), value: (row) => row.capacity },
    { header: t("bookingUi.baseAmount"), value: (row) => row.base_price },
    { header: t("common.status"), value: (row) => roomStatusLabel(t, row.status) },
    { header: t("ops.active"), value: (row) => row.is_active ? t("shared.yes") : t("shared.no") },
  ];

  const exportRooms = async (format) => {
    const response = await roomAPI.listAdminRooms({ page: 1, limit: 1000 });
    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      title: "Rooms List",
      columns: exportColumns,
      rows: response?.data || [],
      filename: `rooms-list-${date}.${format === "pdf" ? "pdf" : "xlsx"}`,
    };
    format === "pdf" ? exportTablePdf(payload) : exportTableExcel(payload);
  };

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        eyebrow={t("ops.inventoryHub")}
        title={t("ops.roomFleetTitle")}
        description={t("ops.roomFleetDescription")}
        actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => exportRooms("excel")}>{t("shared.exportExcel")}</Button><Button variant="outline" onClick={() => exportRooms("pdf")}>{t("shared.exportPdf")}</Button><Button onClick={handleOpenAdd} className="bg-vineyard text-white">{t("ops.addNewRoom")}</Button></div>}
      />

      {isLoading ? (
        <div className="p-10 text-center text-mutedText italic">{t("ops.fetchingInventory")}</div>
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
                  <p className="text-xs font-bold text-mutedText uppercase tracking-widest">{roomCategoryLabel(t, room.category)} • {t("common.floor")} {room.floor || "-"} • {room.view_type || t("ops.noViewSet")}</p>
                  <p className="mt-2 font-black text-vineyard">₹{room.base_price} <span className="text-[10px] font-bold text-mutedText uppercase">/ {t("customer.nights")}</span></p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => handleOpenEdit(room)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-divider text-mutedText px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50">
                    <Edit3 size={16} /> {t("shared.edit")}
                  </button>
                  <button onClick={() => handleDelete(room.id)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100">
                    <Trash2 size={16} /> {t("common.delete")}
                  </button>
                </div>
              </div>
            );
          })}
          {rooms.length === 0 ? <p className="p-10 text-center text-mutedText italic border-2 border-dashed border-divider rounded-2xl">{t("ops.noRoomsInventory")}</p> : null}
          <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-vineyard/40 backdrop-blur-sm p-4 overflow-hidden">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white p-8 md:p-12 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setModalOpen(false)} className="absolute right-6 top-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X size={24} className="text-mutedText" />
            </button>
            <h3 className="mb-8 font-heading text-3xl font-black text-vineyard">{editingRoom ? t("ops.refineRoom") : t("ops.launchRoom")}</h3>

            <div className="space-y-8">
              <section className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">{t("ops.basicSpecifications")}</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <InputField label={`${t("shared.roomNumber")} *`} placeholder="101" value={form.room_number} onChange={(e) => setForm((prev) => ({ ...prev, room_number: e.target.value }))} />
                  <InputField label={t("ops.displayName")} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                  <SelectField
                    label={t("shared.category")}
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    options={[
                      { label: t("room.standard"), value: "Standard" },
                      { label: t("room.deluxe"), value: "Deluxe" },
                      { label: t("room.regular"), value: "Regular" },
                    ]}
                  />
                  <InputField label={t("ops.maxCapacity")} type="number" value={form.capacity} onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))} />
                </div>
              </section>

              <section className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">{t("ops.locationRates")}</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <InputField label={t("common.floor")} type="number" value={form.floor} onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))} />
                  <InputField label={t("ops.viewType")} value={form.view_type} onChange={(e) => setForm((prev) => ({ ...prev, view_type: e.target.value }))} />
                  <div className="md:col-span-2">
                    <InputField label={t("ops.basePriceNight")} type="number" value={form.base_price} onChange={(e) => setForm((prev) => ({ ...prev, base_price: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">{t("ops.description")} *</span>
                      <textarea className="min-h-28 w-full rounded-[24px] border border-divider px-4 py-3" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                    </label>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">{t("ops.roomAmenities")}</p>
                  <p className="mt-1 text-sm text-mutedText">{t("ops.reusableAmenitiesHint")}</p>
                </div>

                <label className="relative block">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-mutedText" size={17} />
                  <input
                    type="search"
                    value={amenitySearch}
                    onChange={(event) => setAmenitySearch(event.target.value)}
                    placeholder={t("ops.searchAmenities")}
                    className="h-11 w-full rounded-2xl border border-divider bg-white pl-11 pr-4 outline-none focus:border-saffron"
                  />
                </label>

                <div className="rounded-2xl border border-divider bg-gray-50/60 p-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-wider text-mutedText">{t("ops.suggestions")}</p>
                  <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                    {visibleAmenityOptions.map((amenity) => {
                      const isSelected = form.amenity_ids.includes(Number(amenity.id));
                      return (
                        <button
                          key={amenity.id}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-bold transition ${
                            isSelected
                              ? "border-vineyard bg-vineyard text-white"
                              : "border-divider bg-white text-vineyard hover:border-saffron"
                          }`}
                        >
                          {isSelected ? <Check size={14} /> : null}
                          {amenity.name}
                          {amenity.status === "inactive" ? ` (${t("ops.inactive")})` : ""}
                        </button>
                      );
                    })}
                    {!visibleAmenityOptions.length ? (
                      <p className="py-2 text-sm text-mutedText">{t("ops.noMatchingAmenities")}</p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-wider text-mutedText">{t("ops.selectedAmenities")}</p>
                  <div className="flex min-h-11 flex-wrap gap-2 rounded-2xl border border-dashed border-divider p-3">
                    {selectedAmenities.map((amenity) => (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        title={t("ops.removeAmenity")}
                        className="inline-flex items-center gap-1.5 rounded-full bg-saffronLight px-3 py-1.5 text-sm font-bold text-vineyard"
                      >
                        {amenity.name} <X size={13} />
                      </button>
                    ))}
                    {!selectedAmenities.length ? (
                      <span className="text-sm text-mutedText">{t("ops.noAmenitiesSelected")}</span>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <InputField
                    label={t("ops.addNewAmenity")}
                    value={newAmenityName}
                    onChange={(event) => setNewAmenityName(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={inlineAmenityMutation.isPending}
                    onClick={addInlineAmenity}
                  >
                    <Plus size={16} /> {inlineAmenityMutation.isPending ? t("shared.processing") : t("admin.addAmenity")}
                  </Button>
                </div>
              </section>

              <section className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">{t("ops.roomImages")}</p>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-[1fr_auto_auto] gap-4 items-end">
                    <InputField label={t("ops.addImageUrl")} placeholder="https://..." value={form.imageInput} onChange={(e) => setForm((prev) => ({ ...prev, imageInput: e.target.value }))} />
                    <Button type="button" variant="outline" onClick={addImageUrl}>{t("ops.addUrl")}</Button>
                    <div className="relative">
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" multiple />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-11 px-6 bg-goldLight text-vineyard rounded-xl font-bold flex items-center gap-2 hover:bg-goldLight/80 transition-colors disabled:opacity-50"
                      >
                        <Upload size={18} /> {uploading ? t("ops.uploading") : t("ops.uploadFiles")}
                      </button>
                    </div>
                  </div>
                  {form.images.length ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {form.images.map((image, index) => (
                        <ImagePreview key={`${image}-${index}`} image={image} index={index} onRemove={removeImage} t={t} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border-2 border-dashed border-divider p-8 text-center text-mutedText">
                      <ImageIcon size={28} className="mx-auto mb-3 opacity-60" />
                      {t("ops.noRoomImages")}
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-saffron">{t("ops.promotionalStrategy")}</p>
                <div className="bg-gray-50 p-6 rounded-2xl space-y-4 border border-divider">
                  <div className="grid md:grid-cols-2 gap-6">
                    <InputField label={t("ops.discountPercent")} type="number" max="100" value={form.discount_pct} onChange={(e) => setForm((prev) => ({ ...prev, discount_pct: e.target.value }))} />
                    <InputField label={t("ops.offerValidUntil")} type="date" value={form.discount_end} onChange={(e) => setForm((prev) => ({ ...prev, discount_end: e.target.value }))} />
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
                {createMutation.isPending || updateMutation.isPending ? t("common.saving") : t("ops.finalizeSave")}
              </button>
              <button onClick={() => setModalOpen(false)} className="py-4 px-8 text-mutedText font-bold hover:text-vineyard transition-colors">{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Helper component to display image with loading and error handling
function ImagePreview({ image, index, onRemove, t }) {
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
          <p className="text-[10px] text-red-600 text-center px-2">{t("ops.imageLoadFailed")}</p>
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
