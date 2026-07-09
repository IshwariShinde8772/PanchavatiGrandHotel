import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { staffAPI } from "../../api/staffAPI";
import { exportTableExcel, exportTablePdf } from "../../utils/exportReports";
import { getPaginationMeta, DEFAULT_PAGE_SIZE } from "../../utils/paginationMeta";
import { openSecurePhoto } from "../../utils/securePhoto";

export default function ManageStaff() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [passwordModal, setPasswordModal] = useState(null); // For showing generated/provided password
  const [page, setPage] = useState(1);

  const { data: staffResponse, isLoading } = useQuery({
    queryKey: ["admin-staff", page],
    queryFn: () => staffAPI.list({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  const staff = staffResponse?.data || [];
  const pagination = getPaginationMeta(staffResponse, staff.length);

  const [form, setForm] = useState({ full_name: "", role: "reception", email: "", phone: "", password: "" });

  const createMutation = useMutation({
    mutationFn: staffAPI.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success(t("ops.created"));
      setModalOpen(false);
      setForm({ full_name: "", role: "reception", email: "", phone: "", password: "" });

      if (data.email_delivery && data.email_delivery.success === false) {
        toast.error(t("shared.actionFailed"));
      }
      
      // Show password modal with the generated/provided password
      if (data.password) {
        setPasswordModal({
          name: form.full_name,
          email: form.email,
          password: data.password
        });
      }
    },
    onError: () => toast.error(t("shared.actionFailed"))
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => staffAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success(t("ops.updated"));
      setModalOpen(false);
    },
    onError: () => toast.error(t("shared.actionFailed"))
  });

  const deleteMutation = useMutation({
    mutationFn: staffAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success(t("ops.deleted"));
    },
    onError: () => toast.error(t("shared.actionFailed"))
  });

  const resetPasswordMutation = useMutation({
    mutationFn: staffAPI.resetPassword,
    onSuccess: (data, staffId) => {
      const member = staff.find((item) => item.id === staffId);
      toast.success(t("shared.actionCompleted"));
      setPasswordModal({
        title: t("ops.resetPassword"),
        name: member?.full_name || t("ops.reception"),
        email: member?.email || t("ops.notProvided"),
        password: data?.data?.tempPassword,
        message: t("ops.passwordShareHint"),
      });

      if (data?.data?.email_delivery?.success === false) {
        toast.error(t("shared.actionFailed"));
      }
    },
    onError: () => toast.error(t("shared.actionFailed"))
  });

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setForm({ full_name: "", role: "reception", email: "", phone: "", password: "" });
    setModalOpen(true);
  };

  const handleOpenEdit = (member) => {
    setEditingStaff(member);
    setForm({ 
      full_name: member.full_name, 
      role: member.role, 
      email: member.email,
      phone: member.phone || "",
      password: "" // Don't show password on edit
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm(t("shared.confirmDelete"))) {
      deleteMutation.mutate(id);
    }
  };

  const handleResetPassword = (member) => {
    if (window.confirm(t("shared.continueConfirm"))) {
      resetPasswordMutation.mutate(member.id);
    }
  };

  const handleSave = () => {
    if (editingStaff) {
      const payload = { ...form };
      delete payload.role;
      delete payload.password; // Don't update password on edit
      updateMutation.mutate({ id: editingStaff.id, payload });
    } else {
      const payload = {
        ...form,
        password: form.password?.trim() || undefined,
      };

      if (!payload.password) {
        delete payload.password;
      }

      createMutation.mutate(payload);
    }
  };

  const exportColumns = [
    { header: t("shared.name"), value: (row) => row.full_name },
    { header: t("shared.role"), value: (row) => String(row.role || "").replace(/_/g, " ") },
    { header: t("ops.specificRole"), value: (row) => row.specific_role || "" },
    { header: t("shared.phone"), value: (row) => row.phone || "" },
    { header: t("shared.email"), value: (row) => row.email || "" },
    { header: t("common.status"), value: (row) => row.is_active === false ? t("ops.inactive") : t("ops.active") },
  ];

  const exportStaff = async (format) => {
    const response = await staffAPI.list({ page: 1, limit: 1000 });
    const rows = response?.data || [];
    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      title: "Staff List",
      columns: exportColumns,
      rows,
      filename: `staff-list-${date}.${format === "pdf" ? "pdf" : "xlsx"}`,
    };
    if (format === "pdf") {
      exportTablePdf(payload);
    } else {
      exportTableExcel(payload);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow={t("layout.manageStaff")}
        title={t("ops.teamRosterTitle")}
        description={t("ops.teamRosterDescription")}
        actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => exportStaff("excel")}>{t("shared.exportExcel")}</Button><Button variant="outline" onClick={() => exportStaff("pdf")}>{t("shared.exportPdf")}</Button><Button onClick={handleOpenAdd}>{t("admin.addStaff")}</Button></div>}
      />
      
      {isLoading ? (
        <p>{t("ops.loadingStaff")}</p>
      ) : (
        <div className="section-card divide-y divide-divider overflow-hidden">
          {staff.map((member) => (
            <div key={member.id} className="grid gap-3 p-5 md:grid-cols-[1fr_0.8fr_1fr_300px] md:items-center">
              <div>
                <p className="font-semibold">{member.full_name}</p>
                <p className="text-xs text-mutedText">{member.phone}</p>
              </div>
              <div>
                <p className="capitalize">{String(member.role).replace(/_/g, " ")}</p>
                {member.specific_role ? <p className="text-xs text-mutedText">{member.specific_role}</p> : null}
              </div>
              <div className="text-sm text-mutedText">
                <p>{member.email || t("ops.notProvided")}</p>
                {member.id_proof_url || member.id_proof_public_id ? (
                  <button
                    type="button"
                    className="font-semibold text-godavari"
                    onClick={() => openSecurePhoto({ type: "staff-id", id: member.id }).catch(() => toast.error(t("shared.actionFailed")))}
                  >
                    {t("ops.viewIdProof")}
                  </button>
                ) : (
                  <span>{t("ops.noIdProof")}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="py-1 px-3 text-xs min-h-auto" onClick={() => setViewingStaff(member)}>{t("shared.view")}</Button>
                <Button variant="outline" className="py-1 px-3 text-xs min-h-auto" onClick={() => handleOpenEdit(member)}>{t("shared.edit")}</Button>
                {member.role === "receptionist" && (
                  <Button
                    variant="outline"
                    className="py-1 px-3 text-xs min-h-auto"
                    disabled={resetPasswordMutation.isPending}
                    onClick={() => handleResetPassword(member)}
                  >
                    {t("ops.resetPassword")}
                  </Button>
                )}
                <Button className="py-1 px-3 text-xs min-h-auto" style={{ backgroundColor: "#DC2626", color: "white" }} onClick={() => handleDelete(member.id)}>{t("common.delete")}</Button>
              </div>
            </div>
          ))}
          {staff.length === 0 && <p className="p-5 text-mutedText">{t("ops.noStaff")}</p>}
          <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      )}

      {viewingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-heading text-2xl">{t("ops.staffDetails")}</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-mutedText">{t("shared.name")}:</span> {viewingStaff.full_name}</p>
              <p><span className="text-mutedText">{t("shared.role")}:</span> {String(viewingStaff.role || "").replace(/_/g, " ")}</p>
              <p><span className="text-mutedText">{t("shared.phone")}:</span> {viewingStaff.phone || t("ops.notProvided")}</p>
              <p><span className="text-mutedText">{t("shared.email")}:</span> {viewingStaff.email || t("ops.notProvided")}</p>
              {viewingStaff.id_proof_public_id || viewingStaff.id_proof_url ? (
                <button
                  type="button"
                  className="font-semibold text-godavari underline"
                  onClick={() => openSecurePhoto({ type: "staff-id", id: viewingStaff.id }).catch(() => toast.error(t("shared.actionFailed")))}
                >
                  {t("ops.viewIdProof")}
                </button>
              ) : <p>{t("ops.noIdProof")}</p>}
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setViewingStaff(null)}>{t("shared.close")}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-heading text-2xl">{editingStaff ? `${t("shared.edit")} ${t("shared.staff")}` : t("admin.addStaff")}</h3>
            <div className="space-y-4">
              <InputField 
                label={t("shared.fullName")}
                value={form.full_name} 
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
              />
              <InputField 
                label={t("auth.emailAddress")}
                type="email"
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
              />
              <InputField 
                label={t("auth.phoneNumber")}
                type="tel"
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              />
              {editingStaff ? (
                <InputField
                  label={t("shared.role")}
                  value={editingStaff.role}
                  readOnly
                />
              ) : (
                <SelectField 
                  label={t("shared.role")}
                  value={form.role} 
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  options={[
                    { label: t("ops.reception"), value: "reception" },
                  ]}
                />
              )}
              {!editingStaff && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">{t("ops.passwordAutoGenerate")}</label>
                  <InputField 
                    type="password"
                    placeholder={t("ops.passwordAutoGenerate")}
                    value={form.password} 
                    onChange={(e) => setForm({ ...form, password: e.target.value })} 
                  />
                  <p className="mt-1 text-xs text-mutedText">
                    {t("auth.passwordRule")}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingStaff ? t("shared.update") : t("shared.create")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Display Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-heading text-2xl">{passwordModal.title || t("ops.staffAccountCreated")}</h3>
            <div className="space-y-4 rounded-lg bg-blue-50 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">{t("shared.name")}</p>
                <p className="text-lg font-semibold">{passwordModal.name}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{t("shared.email")}</p>
                <p className="font-mono text-sm">{passwordModal.email}</p>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-semibold text-gray-600">{t("ops.temporaryPassword")}</p>
                <div className="mt-2 flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={passwordModal.password}
                    className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm font-bold"
                  />
                  <Button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(passwordModal.password);
                        toast.success(t("ops.passwordCopied"));
                      } catch (error) {
                        toast.error(t("shared.actionFailed"));
                      }
                    }}
                    variant="outline"
                  >
                    {t("ops.copy")}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-yellow-50 p-3">
                <p className="text-xs font-semibold text-yellow-800">⚠️ {t("ops.important")}</p>
                <p className="text-xs text-yellow-700 mt-1">
                  {passwordModal.message || t("ops.passwordShareHint")}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setPasswordModal(null)}>{t("ops.done")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
