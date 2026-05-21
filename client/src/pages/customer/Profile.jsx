import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { authAPI } from "../../api/authAPI";

export default function Profile() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    nationality: "",
    id_type: "passport",
    id_number: "",
    id_expiry: "",
    avatar_url: "",
  });

  const [loading, setLoading] = useState(true);
  const { data: profileData } = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => authAPI.me(),
  });

  useEffect(() => {
    if (profileData?.data) {
      setForm({
        full_name: profileData.data.full_name || "",
        email: profileData.data.email || "",
        phone: profileData.data.phone || "",
        nationality: profileData.data.nationality || "",
        id_type: profileData.data.id_type || "passport",
        id_number: profileData.data.id_number || "",
        id_expiry: profileData.data.id_expiry || "",
        avatar_url: profileData.data.avatar_url || "",
      });
      setLoading(false);
    }
  }, [profileData]);

  const updateMutation = useMutation({
    mutationFn: (payload) => authAPI.updateProfile(payload),
    onSuccess: () => {
      toast.success(t("common.profileUpdated"));
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || t("common.profileUpdateFailed"));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">{t("customer.loadingProfile")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("nav.profile")} title={t("customer.profileTitle")} description={t("customer.profileDescription")} />
      <div className="section-card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="mb-4 text-lg font-semibold">{t("customer.personalDetails")}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label={t("customer.fullName")} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              <InputField label={t("customer.email")} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <InputField label={t("customer.phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled />
              <SelectField
                label={t("customer.nationality")}
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                options={[
                  { label: t("customer.selectNationality"), value: "" },
                  { label: "India", value: "India" },
                  { label: "UAE", value: "UAE" },
                  { label: "USA", value: "USA" },
                  { label: "UK", value: "UK" },
                  { label: "Australia", value: "Australia" },
                ]}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">{t("customer.identityDocuments")}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label={t("customer.idType")}
                value={form.id_type}
                onChange={(e) => setForm({ ...form, id_type: e.target.value })}
                options={[
                  { label: t("customer.passport"), value: "passport" },
                  { label: t("customer.nationalId"), value: "national_id" },
                  { label: t("customer.drivingLicense"), value: "driving_license" },
                  { label: t("customer.other"), value: "other" },
                ]}
              />
              <InputField label={t("customer.idNumber")} value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
              <InputField label={t("customer.idExpiryDate")} type="date" value={form.id_expiry} onChange={(e) => setForm({ ...form, id_expiry: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t("common.saving") : t("common.saveChanges")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
