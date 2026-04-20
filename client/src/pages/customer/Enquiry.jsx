import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { enquiryAPI } from "../../api/enquiryAPI";
import { authAPI } from "../../api/authAPI";

export default function Enquiry() {
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

  // Fetch customer profile to pre-fill
  const { data: profileData } = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => authAPI.me(),
  });

  // Create enquiry mutation
  const createMutation = useMutation({
    mutationFn: (payload) => enquiryAPI.create(payload),
    onSuccess: () => {
      toast.success("Enquiry submitted successfully! Admin will respond soon.");
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
      toast.error(error.response?.data?.error || "Failed to submit enquiry");
    },
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!form.full_name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    if (!form.message.trim()) {
      toast.error("Please enter your enquiry message");
      return;
    }

    createMutation.mutate({
      ...form,
      source: "customer_portal",
    });
  };

  // Pre-fill with profile data
  const displayForm = {
    ...form,
    full_name: form.full_name || profileData?.data?.full_name || "",
    phone: form.phone || profileData?.data?.phone || "",
    email: form.email || profileData?.data?.email || "",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Enquiry"
        title="Ask us anything about your stay"
        description="Have questions about room availability, pricing, or special arrangements? Submit your enquiry and our team will respond within 24 hours."
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="section-card space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Full Name"
              value={displayForm.full_name}
              onChange={(e) => handleChange("full_name", e.target.value)}
              required
            />
            <InputField
              label="Phone"
              value={displayForm.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              required
            />
            <InputField
              label="Email"
              type="email"
              value={displayForm.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
            <SelectField
              label="Room Category"
              value={form.room_category}
              onChange={(e) => handleChange("room_category", e.target.value)}
              options={[
                { label: "Any", value: "" },
                { label: "Economy", value: "Economy" },
                { label: "Standard", value: "Standard" },
                { label: "Deluxe", value: "Deluxe" },
                { label: "Suite", value: "Suite" },
              ]}
            />
            <InputField
              label="Check-In Date"
              type="date"
              value={form.check_in}
              onChange={(e) => handleChange("check_in", e.target.value)}
            />
            <InputField
              label="Check-Out Date"
              type="date"
              value={form.check_out}
              onChange={(e) => handleChange("check_out", e.target.value)}
            />
            <SelectField
              label="Number of Adults"
              value={form.adults}
              onChange={(e) => handleChange("adults", e.target.value)}
              options={[
                { label: "1", value: "1" },
                { label: "2", value: "2" },
                { label: "3", value: "3" },
                { label: "4", value: "4" },
                { label: "5+", value: "5+" },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Your Enquiry *</label>
            <textarea
              value={form.message}
              onChange={(e) => handleChange("message", e.target.value)}
              placeholder="Tell us more about your enquiry, special requests, or questions..."
              required
              className="w-full h-32 rounded-[16px] border border-divider px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Enquiry"}
            </Button>
          </div>
        </form>
      )}

      {/* Sample FAQs Section */}
      <div className="section-card p-6">
        <h3 className="font-heading text-lg mb-4">Common Questions</h3>
        <div className="space-y-4">
          <div className="pb-4 border-b border-divider last:border-0">
            <p className="font-semibold text-sm mb-2">What is included in the room tariff?</p>
            <p className="text-sm text-mutedText">All rooms include daily breakfast, WiFi, and access to hotel facilities. Some categories offer complimentary airport transfers.</p>
          </div>
          <div className="pb-4 border-b border-divider last:border-0">
            <p className="font-semibold text-sm mb-2">Can I modify my booking?</p>
            <p className="text-sm text-mutedText">Yes, you can modify dates and room category up to 48 hours before check-in, subject to availability.</p>
          </div>
          <div className="pb-4 border-b border-divider last:border-0">
            <p className="font-semibold text-sm mb-2">Do you offer group discounts?</p>
            <p className="text-sm text-mutedText">We offer special rates for group bookings of 10+ rooms. Please submit an enquiry with your group details.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
