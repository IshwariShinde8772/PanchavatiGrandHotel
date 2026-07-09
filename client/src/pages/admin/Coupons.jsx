import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { couponAPI } from "../../api/couponAPI";
import { adminAPI } from "../../api/adminAPI";
import { formatCurrency } from "../../utils/formatCurrency";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "../../utils/paginationMeta";
import { roomCategoryLabel } from "../../utils/i18nLabels";

const ROOM_TYPES = ["Standard", "Deluxe", "Regular"];

const emptyForm = {
  code: "",
  title: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  max_discount_amount: "",
  min_booking_amount: "0",
  valid_from: "",
  valid_till: "",
  eligibility_type: "all_customers",
  eligible_customer_ids: [],
  applicable_scope: "all_rooms",
  applicable_room_ids: [],
  applicable_room_type_ids: [],
  can_combine_with_offers: false,
  total_usage_limit: "",
  per_user_usage_limit: "1",
  status: "active",
};

function selectedValues(event, numeric = false) {
  return [...event.target.selectedOptions].map((option) => (
    numeric ? Number(option.value) : option.value
  ));
}

function couponPayload(form) {
  return {
    ...form,
    code: form.code.trim().toUpperCase(),
    discount_value: Number(form.discount_value),
    max_discount_amount: form.max_discount_amount === "" ? null : Number(form.max_discount_amount),
    min_booking_amount: Number(form.min_booking_amount || 0),
    total_usage_limit: form.total_usage_limit === "" ? null : Number(form.total_usage_limit),
    per_user_usage_limit: form.per_user_usage_limit === "" ? null : Number(form.per_user_usage_limit),
  };
}

function discountLabel(coupon) {
  if (coupon.discount_type === "percentage") {
    const cap = coupon.max_discount_amount !== null && coupon.max_discount_amount !== undefined
      ? ` (max ${formatCurrency(coupon.max_discount_amount)})`
      : "";
    return `${Number(coupon.discount_value)}%${cap}`;
  }
  return formatCurrency(coupon.discount_value);
}

function statusClasses(status) {
  if (status === "active") return "bg-emerald-100 text-emerald-800";
  if (status === "expired") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

export default function Coupons() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ["admin-coupons", page],
    queryFn: () => couponAPI.list({ page, limit: DEFAULT_PAGE_SIZE }),
  });
  const { data: roomsResponse } = useQuery({
    queryKey: ["admin-coupon-rooms"],
    queryFn: () => adminAPI.listRooms({ page: 1, limit: 1000 }),
  });
  const { data: customersResponse } = useQuery({
    queryKey: ["admin-coupon-customers"],
    queryFn: () => adminAPI.listCustomers({ page: 1, limit: 1000 }),
  });

  const items = response?.data || [];
  const rooms = roomsResponse?.data || [];
  const customers = customersResponse?.data || [];
  const pagination = getPaginationMeta(response, items.length);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? couponAPI.update(id, payload) : couponAPI.create(payload)),
    onSuccess: (_, variables) => {
      invalidate();
      setModalOpen(false);
      toast.success(variables.id ? t("ops.updated") : t("ops.created"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => couponAPI.setStatus(id, status),
    onSuccess: invalidate,
    onError: () => toast.error(t("shared.actionFailed")),
  });
  const deleteMutation = useMutation({
    mutationFn: couponAPI.delete,
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success(t("ops.deleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };
  const openEdit = (coupon) => {
    setEditing(coupon);
    setForm({
      ...emptyForm,
      ...coupon,
      discount_value: String(coupon.discount_value ?? ""),
      max_discount_amount: coupon.max_discount_amount ?? "",
      min_booking_amount: String(coupon.min_booking_amount ?? 0),
      total_usage_limit: coupon.total_usage_limit ?? "",
      per_user_usage_limit: coupon.per_user_usage_limit ?? "",
      eligible_customer_ids: coupon.eligible_customer_ids || [],
      applicable_room_ids: coupon.applicable_room_ids || [],
      applicable_room_type_ids: coupon.applicable_room_type_ids || [],
    });
    setModalOpen(true);
  };

  const selectedCustomerHint = useMemo(() => {
    if (form.eligibility_type !== "selected_customers") return "";
    return t("ops.customersSelected", { count: form.eligible_customer_ids.length });
  }, [form.eligibility_type, form.eligible_customer_ids, t]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("ops.couponEyebrow")}
        title={t("admin.couponsTitle")}
        description={t("ops.couponDescription")}
        actions={<Button onClick={openCreate}>+ {t("ops.createCoupon")}</Button>}
      />

      <div className="section-card overflow-x-auto">
        {isLoading ? <p className="p-6 text-mutedText">{t("ops.loadingCoupons")}</p> : (
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-divider bg-saffronLight/40 text-xs uppercase tracking-wider text-mutedText">
              <tr>
                {[t("ops.couponCode"), t("ops.couponTitle"), t("ops.discount"), t("ops.validFrom"), t("ops.validTill"), t("ops.eligibility"), t("ops.usage"), t("common.status"), t("ops.actions")].map((heading) => (
                  <th className="px-4 py-3" key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((coupon) => (
                <tr className="border-b border-divider/70 align-top" key={coupon.id}>
                  <td className="px-4 py-4 font-mono font-bold text-primary">{coupon.code}</td>
                  <td className="px-4 py-4 font-semibold">{coupon.title}</td>
                  <td className="px-4 py-4">{discountLabel(coupon)}</td>
                  <td className="px-4 py-4">{coupon.valid_from}</td>
                  <td className="px-4 py-4">{coupon.valid_till}</td>
                  <td className="px-4 py-4">{coupon.eligibility_type.replaceAll("_", " ")}</td>
                  <td className="px-4 py-4">
                    <p>{coupon.used_count}/{coupon.total_usage_limit ?? "∞"}</p>
                    <p className="mt-1 text-xs text-mutedText">{formatCurrency(coupon.total_discount_given || 0)} given</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClasses(coupon.status)}`}>
                      {coupon.status === "active" ? t("ops.active") : coupon.status === "inactive" ? t("ops.inactive") : t("ops.expired")}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button className="min-h-9 px-3 py-1.5 text-xs" variant="outline" onClick={() => navigate(`/admin/coupons/${coupon.id}`)}>{t("shared.view")}</Button>
                      <Button className="min-h-9 px-3 py-1.5 text-xs" variant="outline" onClick={() => openEdit(coupon)}>{t("shared.edit")}</Button>
                      {coupon.status !== "expired" ? (
                        <Button
                          className="min-h-9 px-3 py-1.5 text-xs"
                          variant="outline"
                          onClick={() => statusMutation.mutate({
                            id: coupon.id,
                            status: coupon.status === "active" ? "inactive" : "active",
                          })}
                        >
                          {coupon.status === "active" ? t("ops.deactivate") : t("ops.activate")}
                        </Button>
                      ) : null}
                      <button
                        className="rounded-lg bg-maroon px-3 py-1.5 text-xs font-bold text-white"
                        onClick={() => setDeleteTarget(coupon)}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr><td className="px-6 py-12 text-center text-mutedText" colSpan="9">{t("ops.noCoupons")}</td></tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
      <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t("ops.editCoupon") : t("ops.createCoupon")}>
        <div className="max-h-[72vh] space-y-5 overflow-y-auto pr-2">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label={t("ops.couponCode")} required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} />
            <InputField label={t("ops.couponTitle")} required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">{t("ops.description")}</span>
            <textarea className="min-h-24 w-full rounded-2xl border border-divider p-4" value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label={t("ops.discountType")}
              value={form.discount_type}
              onChange={(event) => setForm({ ...form, discount_type: event.target.value })}
              options={[{ label: t("ops.percentage"), value: "percentage" }, { label: t("ops.fixedAmount"), value: "fixed" }]}
            />
            <InputField label={t("ops.discountValue")} required type="number" min="0.01" step="0.01" value={form.discount_value} onChange={(event) => setForm({ ...form, discount_value: event.target.value })} />
            <InputField label={t("ops.maximumDiscount")} type="number" min="0" step="0.01" value={form.max_discount_amount} disabled={form.discount_type !== "percentage"} onChange={(event) => setForm({ ...form, max_discount_amount: event.target.value })} />
            <InputField label={t("ops.minimumBookingAmount")} type="number" min="0" step="0.01" value={form.min_booking_amount} onChange={(event) => setForm({ ...form, min_booking_amount: event.target.value })} />
            <InputField label={t("ops.validFrom")} required type="date" value={form.valid_from} onChange={(event) => setForm({ ...form, valid_from: event.target.value })} />
            <InputField label={t("ops.validTill")} required type="date" value={form.valid_till} onChange={(event) => setForm({ ...form, valid_till: event.target.value })} />
          </div>
          <SelectField
            label={t("ops.eligibility")}
            value={form.eligibility_type}
            onChange={(event) => setForm({ ...form, eligibility_type: event.target.value, eligible_customer_ids: [] })}
            options={[
              { label: t("ops.allCustomers"), value: "all_customers" },
              { label: t("ops.firstTimeCustomers"), value: "first_time_customers" },
              { label: t("ops.existingCustomers"), value: "existing_customers" },
              { label: t("ops.selectedCustomers"), value: "selected_customers" },
            ]}
          />
          {form.eligibility_type === "selected_customers" ? (
            <label className="block text-sm">
              <span className="mb-2 block font-medium">{t("ops.eligibleCustomers")}</span>
              <select
                multiple
                className="min-h-36 w-full rounded-2xl border border-divider p-3"
                value={form.eligible_customer_ids.map(String)}
                onChange={(event) => setForm({ ...form, eligible_customer_ids: selectedValues(event, true) })}
              >
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} — {customer.email || customer.phone}</option>)}
              </select>
              <span className="mt-1 block text-xs text-mutedText">{selectedCustomerHint}</span>
            </label>
          ) : null}
          <SelectField
            label={t("ops.applicableScope")}
            value={form.applicable_scope}
            onChange={(event) => setForm({
              ...form,
              applicable_scope: event.target.value,
              applicable_room_ids: [],
              applicable_room_type_ids: [],
            })}
            options={[
              { label: t("ops.allRooms"), value: "all_rooms" },
              { label: t("ops.selectedRooms"), value: "selected_rooms" },
              { label: t("ops.selectedRoomTypes"), value: "selected_room_types" },
            ]}
          />
          {form.applicable_scope === "selected_rooms" ? (
            <label className="block text-sm">
              <span className="mb-2 block font-medium">{t("common.rooms")}</span>
              <select
                multiple
                className="min-h-32 w-full rounded-2xl border border-divider p-3"
                value={form.applicable_room_ids.map(String)}
                onChange={(event) => setForm({ ...form, applicable_room_ids: selectedValues(event, true) })}
              >
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.room_number} — {room.name} ({roomCategoryLabel(t, room.category)})</option>)}
              </select>
            </label>
          ) : null}
          {form.applicable_scope === "selected_room_types" ? (
            <label className="block text-sm">
              <span className="mb-2 block font-medium">{t("ops.roomTypes")}</span>
              <select
                multiple
                className="min-h-32 w-full rounded-2xl border border-divider p-3"
                value={form.applicable_room_type_ids}
                onChange={(event) => setForm({ ...form, applicable_room_type_ids: selectedValues(event) })}
              >
                {ROOM_TYPES.map((category) => <option key={category} value={category}>{roomCategoryLabel(t, category)}</option>)}
              </select>
            </label>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label={t("ops.totalUsageLimit")} type="number" min="0" value={form.total_usage_limit} onChange={(event) => setForm({ ...form, total_usage_limit: event.target.value })} />
            <InputField label={t("ops.perUserLimit")} type="number" min="0" value={form.per_user_usage_limit} onChange={(event) => setForm({ ...form, per_user_usage_limit: event.target.value })} />
            <SelectField
              label={t("common.status")}
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              options={[
                { label: t("ops.active"), value: "active" },
                { label: t("ops.inactive"), value: "inactive" },
                { label: t("ops.expired"), value: "expired" },
              ]}
            />
            <label className="flex items-center gap-3 pt-6 text-sm font-semibold">
              <input type="checkbox" checked={form.can_combine_with_offers} onChange={(event) => setForm({ ...form, can_combine_with_offers: event.target.checked })} />
              {t("ops.combineOffers")}
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-divider pt-4">
          <Button variant="outline" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
          <Button
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate({ id: editing?.id, payload: couponPayload(form) })}
          >
            {saveMutation.isPending ? t("common.saving") : editing ? t("ops.updateCoupon") : t("ops.createCoupon")}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title={t("ops.deleteCoupon")}
        description={t("shared.confirmDelete")}
        confirmText={deleteMutation.isPending ? t("ops.deleting") : t("common.delete")}
      />
    </div>
  );
}
