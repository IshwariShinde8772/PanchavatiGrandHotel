import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { enquiryAPI } from "../../api/enquiryAPI";
import { authAPI } from "../../api/authAPI";

export default function Enquiry() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    check_in: "",
    check_out: "",
    adults: "1",
    room_category: "",
    message: "",
  });

  const [showForm, setShowForm] = useState(true);
  const { data: profileData } = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => authAPI.me(),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => enquiryAPI.create(payload),
    onSuccess: () => {
      toast.success(t("customer.enquirySuccess"));
      setForm({
        full_name: profileData?.data?.full_name || "",
        phone: profileData?.data?.phone || "",
        email: profileData?.data?.email || "",
        check_in: "",
        check_out: "",
        adults: "1",
        room_category: "",
        message: "",
      });
      setShowForm(false);
      setTimeout(() => setShowForm(true), 2000);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || t("customer.enquiryFailed"));
    },
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.full_name.trim()) {
      toast.error(t("customer.enterName"));
      return;
    }
    if (!form.phone.trim()) {
      toast.error(t("customer.enterPhone"));
      return;
    }
    if (!form.message.trim()) {
      toast.error(t("customer.enterMessage"));
      return;
    }

    createMutation.mutate({
      ...form,
      source: "customer_portal",
    });
  };

  const displayForm = {
    ...form,
    full_name: form.full_name || profileData?.data?.full_name || "",
    phone: form.phone || profileData?.data?.phone || "",
    email: form.email || profileData?.data?.email || "",
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("nav.enquiry")} title={t("customer.enquiryTitle")} description={t("customer.enquiryDescription")} />

      {showForm && (
        <form onSubmit={handleSubmit} className="section-card space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label={t("customer.fullName")} value={displayForm.full_name} onChange={(e) => handleChange("full_name", e.target.value)} required />
            <InputField label={t("customer.phone")} value={displayForm.phone} onChange={(e) => handleChange("phone", e.target.value)} required />
            <InputField label={t("customer.email")} type="email" value={displayForm.email} onChange={(e) => handleChange("email", e.target.value)} />
            <SelectField
              label={t("customer.roomCategory")}
              value={form.room_category}
              onChange={(e) => handleChange("room_category", e.target.value)}
              options={[
                { label: t("customer.any"), value: "" },
                { label: t("room.economy"), value: "Economy" },
                { label: t("room.standard"), value: "Standard" },
                { label: t("room.deluxe"), value: "Deluxe" },
                { label: t("room.suite"), value: "Suite" },
              ]}
            />
            <InputField label={t("customer.checkInDate")} type="date" value={form.check_in} onChange={(e) => handleChange("check_in", e.target.value)} />
            <InputField label={t("customer.checkOutDate")} type="date" value={form.check_out} onChange={(e) => handleChange("check_out", e.target.value)} />
            <SelectField
              label={t("customer.adults")}
              value={form.adults}
              onChange={(e) => handleChange("adults", e.target.value)}
              options={["1", "2", "3", "4", "5+"].map((value) => ({ label: value, value }))}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">{t("customer.yourEnquiry")}</label>
            <textarea
              value={form.message}
              onChange={(e) => handleChange("message", e.target.value)}
              placeholder={t("customer.enquiryPlaceholder")}
              required
              className="h-32 w-full resize-none rounded-[16px] border border-divider px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? t("common.submitting") : t("customer.submitEnquiry")}
            </Button>
          </div>
        </form>
      )}

      <div className="section-card p-6">
        <h3 className="mb-4 font-heading text-lg">{t("customer.commonQuestions")}</h3>
        <div className="space-y-4">
          {[
            [t("customer.faqTariffQ"), t("customer.faqTariffA")],
            [t("customer.faqModifyQ"), t("customer.faqModifyA")],
            [t("customer.faqGroupQ"), t("customer.faqGroupA")],
          ].map(([question, answer]) => (
            <div key={question} className="border-b border-divider pb-4 last:border-0">
              <p className="mb-2 text-sm font-semibold">{question}</p>
              <p className="text-sm text-mutedText">{answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
