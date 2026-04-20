import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { authAPI } from "../../api/authAPI";

export default function Profile() {
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

  // Fetch profile data
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

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (payload) => authAPI.updateProfile(payload),
    onSuccess: () => {
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to update profile");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Profile" 
        title="Personal information and travel documents" 
        description="Manage identity, communication preferences, and saved booking details." 
      />
      <div className="section-card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Personal Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <InputField 
                label="Full Name" 
                value={form.full_name} 
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
              <InputField 
                label="Email" 
                type="email" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <InputField 
                label="Phone" 
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled
              />
              <SelectField
                label="Nationality"
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                options={[
                  { label: "Select Nationality", value: "" },
                  { label: "India", value: "India" }, 
                  { label: "UAE", value: "UAE" }, 
                  { label: "USA", value: "USA" },
                  { label: "UK", value: "UK" },
                  { label: "Australia", value: "Australia" },
                ]}
              />
            </div>
          </div>

          {/* Identity Documents */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Identity Documents</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="ID Type"
                value={form.id_type}
                onChange={(e) => setForm({ ...form, id_type: e.target.value })}
                options={[
                  { label: "Passport", value: "passport" },
                  { label: "National ID", value: "national_id" },
                  { label: "Driving License", value: "driving_license" },
                  { label: "Other", value: "other" },
                ]}
              />
              <InputField 
                label="ID Number" 
                value={form.id_number} 
                onChange={(e) => setForm({ ...form, id_number: e.target.value })}
              />
              <InputField 
                label="ID Expiry Date" 
                type="date" 
                value={form.id_expiry} 
                onChange={(e) => setForm({ ...form, id_expiry: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

