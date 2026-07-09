import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import FileUpload from "../../components/forms/FileUpload";
import { staffAPI } from "../../api/staffAPI";
import { uploadAPI } from "../../api/uploadAPI";
import { exportTableExcel, exportTablePdf } from "../../utils/exportReports";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "../../utils/paginationMeta";
import { openSecurePhoto } from "../../utils/securePhoto";

const initialForm = {
  full_name: "",
  phone: "",
  email: "",
  address: "",
  gender: "male",
  role: "housekeeping",
  specific_role: "",
  joining_date: new Date().toISOString().slice(0, 10),
  shift: "",
  id_proof_type: "Aadhaar",
  id_proof_url: "",
  id_proof_public_id: "",
};

export default function AddStaff() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);

  const { data: staffResponse, isLoading } = useQuery({
    queryKey: ["receptionist-added-staff", page],
    queryFn: () => staffAPI.listReceptionist({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  const staff = staffResponse?.data || [];
  const pagination = getPaginationMeta(staffResponse, staff.length);

  const mutation = useMutation({
    mutationFn: staffAPI.createReceptionist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-added-staff"] });
      toast.success(t("shared.actionCompleted"));
      setForm(initialForm);
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const uploadProof = async (file) => {
    if (!file) {
      return;
    }

    try {
      setUploading(true);
      const response = await uploadAPI.cloudinary(file, "staff-id-proofs");
      update("id_proof_url", response.data.url);
      update("id_proof_public_id", response.data.public_id);
      toast.success(t("shared.actionCompleted"));
    } catch (error) {
      toast.error(t("shared.actionFailed"));
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    if (!form.id_proof_url || !form.id_proof_public_id) {
      toast.error(t("ops.idProofRequired"));
      return;
    }

    if (form.role === "admin_staff" && (!form.specific_role.trim() || !form.email.trim())) {
      toast.error(t("ops.completeFields"));
      return;
    }

    mutation.mutate({
      ...form,
      email: form.email.trim() || undefined,
      specific_role: form.role === "admin_staff" ? form.specific_role : undefined,
    });
  };

  const exportColumns = [
    { header: t("shared.name"), value: (row) => row.full_name || "" },
    { header: t("shared.phone"), value: (row) => row.phone || "" },
    { header: t("shared.email"), value: (row) => row.email || "" },
    { header: t("shared.role"), value: (row) => String(row.role || "").replace(/_/g, " ") },
    { header: t("ops.specificRole"), value: (row) => row.specific_role || "" },
    { header: t("ops.joiningDate"), value: (row) => row.joining_date || "" },
    { header: t("common.status"), value: (row) => row.is_active ? t("ops.active") : t("ops.inactive") },
  ];

  const exportStaff = async (format) => {
    const response = await staffAPI.listReceptionist({ page: 1, limit: 1000 });
    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      title: "Reception Staff List",
      columns: exportColumns,
      rows: response?.data || [],
      filename: `reception-staff-list-${date}.${format === "pdf" ? "pdf" : "xlsx"}`,
    };
    format === "pdf" ? exportTablePdf(payload) : exportTableExcel(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("layout.addStaff")}
        title={t("ops.createStaffTitle")}
        description={t("ops.createStaffDescription")}
        actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => exportStaff("excel")}>{t("shared.exportExcel")}</Button><Button variant="outline" onClick={() => exportStaff("pdf")}>{t("shared.exportPdf")}</Button></div>}
      />

      <div className="section-card p-6 grid gap-4 md:grid-cols-2">
        <InputField label={t("shared.fullName")} value={form.full_name} onChange={(event) => update("full_name", event.target.value)} />
        <InputField label={t("auth.phoneNumber")} value={form.phone} onChange={(event) => update("phone", event.target.value)} />
        <InputField label={`${t("auth.emailAddress")} (${t(form.role === "admin_staff" ? "shared.required" : "shared.optional")})`} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
        <SelectField
          label={t("ops.gender")}
          value={form.gender}
          onChange={(event) => update("gender", event.target.value)}
          options={[
            { label: t("ops.male"), value: "male" },
            { label: t("ops.female"), value: "female" },
            { label: t("ops.other"), value: "other" },
          ]}
        />
        <SelectField
          label={t("ops.staffType")}
          value={form.role}
          onChange={(event) => update("role", event.target.value)}
          options={[
            { label: t("ops.housekeeping"), value: "housekeeping" },
            { label: t("ops.waiter"), value: "waiter" },
            { label: t("ops.adminStaff"), value: "admin_staff" },
          ]}
        />
        {form.role === "admin_staff" ? (
          <InputField label={t("ops.specificRole")} value={form.specific_role} onChange={(event) => update("specific_role", event.target.value)} />
        ) : (
          <InputField label={`${t("ops.shift")} (${t("shared.optional")})`} value={form.shift} onChange={(event) => update("shift", event.target.value)} />
        )}
        <InputField label={t("ops.joiningDate")} type="date" value={form.joining_date} onChange={(event) => update("joining_date", event.target.value)} />
        <InputField label={t("ops.idProofType")} value={form.id_proof_type} onChange={(event) => update("id_proof_type", event.target.value)} />
        <InputField className="md:col-span-2" label={t("ops.address")} value={form.address} onChange={(event) => update("address", event.target.value)} />
        <div className="md:col-span-2">
          <FileUpload label={t("ops.uploadIdRequired")} onChange={(event) => uploadProof(event.target.files?.[0])} />
          {form.id_proof_url ? (
            <a className="mt-2 inline-block text-sm font-semibold text-godavari" href={form.id_proof_url} target="_blank" rel="noreferrer">
              {t("bookingUi.viewId")}
            </a>
          ) : (
            <p className="mt-2 text-sm text-red-600">{t("ops.idProofRequired")}</p>
          )}
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button onClick={submit} disabled={mutation.isPending || uploading}>
            {uploading ? t("ops.uploading") : mutation.isPending ? t("common.saving") : t("admin.addStaff")}
          </Button>
        </div>
      </div>

      <div className="section-card overflow-hidden">
        <div className="border-b border-divider p-5">
          <h3 className="font-heading text-2xl">{t("ops.staffAddedByYou")}</h3>
          <p className="text-sm text-mutedText">{t("ops.staffAddedHint")}</p>
        </div>
        {isLoading ? (
          <p className="p-5 text-sm text-mutedText">{t("ops.loadingStaff")}</p>
        ) : staff.length === 0 ? (
          <p className="p-5 text-sm text-mutedText">{t("ops.noStaffAdded")}</p>
        ) : (
          <div className="divide-y divide-divider">
            {staff.map((member) => (
              <div key={member.id} className="grid gap-3 p-5 md:grid-cols-[1fr_0.8fr_1fr_140px] md:items-center">
                <div>
                  <p className="font-semibold">{member.full_name}</p>
                  <p className="text-sm text-mutedText">{member.phone}</p>
                  {member.email ? <p className="text-sm text-mutedText">{member.email}</p> : null}
                </div>
                <div>
                  <p className="capitalize">{String(member.role || "").replace(/_/g, " ")}</p>
                  {member.specific_role ? <p className="text-sm text-mutedText">{member.specific_role}</p> : null}
                </div>
                <div className="text-sm text-mutedText">
                  <p>{member.joining_date ? `${t("ops.joined")}: ${member.joining_date}` : `${t("ops.joiningDate")}: ${t("ops.notSet")}`}</p>
                  <p>{member.shift ? `${t("ops.shift")}: ${member.shift}` : `${t("ops.shift")}: ${t("ops.notSet")}`}</p>
                  <p className={member.is_active ? "text-green-700" : "text-red-700"}>
                    {member.is_active ? t("ops.active") : t("ops.inactive")}
                  </p>
                </div>
                <div>
                  {member.id_proof_url || member.id_proof_public_id ? (
                    <button
                      type="button"
                      className="text-sm font-semibold text-godavari"
                      onClick={() => openSecurePhoto({ type: "staff-id", id: member.id }).catch(() => toast.error(t("shared.actionFailed")))}
                    >
                      {t("ops.viewIdProof")}
                    </button>
                  ) : (
                    <span className="text-sm text-mutedText">{t("ops.noIdProof")}</span>
                  )}
                </div>
              </div>
            ))}
            <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
