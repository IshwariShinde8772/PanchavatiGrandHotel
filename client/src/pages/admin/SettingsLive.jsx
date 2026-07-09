import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import { settingsAPI } from "../../api/settingsAPI";

const EMPTY_FORM = {
  gst_percent: "12",
  phone: "",
  email: "",
  whatsapp: "",
  bank_name: "",
  upi_id: "",
  gstin_number: "",
  pan_number: "",
  address: "",
  cancellation_policy_text: "",
};

export default function SettingsLive() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: response, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: settingsAPI.get,
  });

  useEffect(() => {
    if (!response?.data) {
      return;
    }

    const data = response.data;
    setForm({
      gst_percent: String(data.gst_percent ?? 12),
      phone: data.phone || "",
      email: data.email || "",
      whatsapp: data.whatsapp || "",
      bank_name: data.bank_name || "",
      upi_id: data.upi_id || "",
      gstin_number: data.gstin_number || "",
      pan_number: data.pan_number || "",
      address: data.address || "",
      cancellation_policy_text: data.cancellation_policy_text || "",
    });
  }, [response]);

  const updateMutation = useMutation({
    mutationFn: settingsAPI.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success(t("shared.actionCompleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const handleSave = () => {
    updateMutation.mutate({
      gst_percent: Number(form.gst_percent || 12),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      bank_name: form.bank_name.trim() || null,
      upi_id: form.upi_id.trim() || null,
      gstin_number: form.gstin_number.trim() || null,
      pan_number: form.pan_number.trim() || null,
      address: form.address.trim() || null,
      cancellation_policy_text: form.cancellation_policy_text.trim() || null,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("layout.settings")}
        title={t("ops.settingsIdentityTitle")}
        description={t("ops.settingsDescription")}
      />

      {isLoading ? (
        <p className="p-6 text-mutedText">{t("ops.loadingSettings")}</p>
      ) : (
        <div className="section-card p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <InputField label="GST %" type="number" value={form.gst_percent} onChange={(event) => setForm((current) => ({ ...current, gst_percent: event.target.value }))} />
            <InputField label={t("shared.phone")} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            <InputField label={t("shared.email")} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            <InputField label="WhatsApp" value={form.whatsapp} onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))} />
            <InputField label="UPI ID" value={form.upi_id} onChange={(event) => setForm((current) => ({ ...current, upi_id: event.target.value }))} />
            <InputField label={t("ops.bankName")} value={form.bank_name} onChange={(event) => setForm((current) => ({ ...current, bank_name: event.target.value }))} />
            <InputField label="GSTIN" value={form.gstin_number} onChange={(event) => setForm((current) => ({ ...current, gstin_number: event.target.value }))} />
            <InputField label={t("ops.panNumber")} value={form.pan_number} onChange={(event) => setForm((current) => ({ ...current, pan_number: event.target.value }))} />
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#526359" }}>
              {t("ops.address")}
            </span>
            <textarea
              className="min-h-28 w-full rounded-[24px] border border-divider px-4 py-3"
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            />
          </label>

          <label className="mt-5 block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#526359" }}>
              {t("ops.cancellationPolicy")}
            </span>
            <textarea
              className="min-h-28 w-full rounded-[24px] border border-divider px-4 py-3"
              value={form.cancellation_policy_text}
              onChange={(event) => setForm((current) => ({ ...current, cancellation_policy_text: event.target.value }))}
            />
          </label>

          <Button className="mt-6" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? t("common.saving") : t("admin.saveSettings")}
          </Button>
        </div>
      )}
    </div>
  );
}
