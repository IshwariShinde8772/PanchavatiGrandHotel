import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { staffAPI } from "../../api/staffAPI";

export default function ManageStaff() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [passwordModal, setPasswordModal] = useState(null); // For showing generated/provided password

  const { data: staffResponse, isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => staffAPI.list(),
  });

  const staff = staffResponse?.data || [];

  const [form, setForm] = useState({ full_name: "", role: "receptionist", email: "", phone: "", password: "" });

  const createMutation = useMutation({
    mutationFn: staffAPI.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success("Staff member created successfully");
      setModalOpen(false);
      setForm({ full_name: "", role: "receptionist", email: "", phone: "", password: "" });

      if (data.email_delivery && data.email_delivery.success === false) {
        toast.error("Staff account saved, but welcome email could not be delivered.");
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
    onError: (err) => toast.error(err.response?.data?.error || "Failed to create staff member")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => staffAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success("Staff updated successfully");
      setModalOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to update staff")
  });

  const deleteMutation = useMutation({
    mutationFn: staffAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success("Staff deleted successfully");
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to delete staff")
  });

  const resetPasswordMutation = useMutation({
    mutationFn: staffAPI.resetPassword,
    onSuccess: (data, staffId) => {
      const member = staff.find((item) => item.id === staffId);
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success("Password reset successfully");
      setPasswordModal({
        name: member?.full_name || "Staff",
        email: member?.email || "",
        password: data.data?.tempPassword || "",
      });
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to reset password"),
  });

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setForm({ full_name: "", role: "receptionist", email: "", phone: "", password: "" });
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
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSave = () => {
    if (editingStaff) {
      const payload = { ...form };
      delete payload.password; // Don't update password on edit
      updateMutation.mutate({ id: editingStaff.id, payload });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Manage Staff" 
        title="Team roster and account controls" 
        description="Create, edit, deactivate, and reset credentials for hotel staff. Receptionists and managers can log in, while housekeeping staff are assigned from the receptionist desk." 
        actions={<Button onClick={handleOpenAdd}>Add Staff</Button>} 
      />
      
      {isLoading ? (
        <p>Loading staff...</p>
      ) : (
        <div className="section-card divide-y divide-divider overflow-hidden">
          {staff.map((member) => (
            <div key={member.id} className="grid gap-3 p-5 md:grid-cols-[1fr_0.8fr_1fr_250px] md:items-center">
              <p className="font-semibold">{member.full_name}</p>
              <p className="capitalize">{member.role}</p>
              <p className="text-sm text-mutedText">{member.email}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="py-1 px-3 text-xs min-h-auto" onClick={() => handleOpenEdit(member)}>Edit</Button>
                <Button className="py-1 px-3 text-xs min-h-auto" style={{ backgroundColor: "#2D5A27", color: "white" }} onClick={() => resetPasswordMutation.mutate(member.id)}>Reset Password</Button>
                <Button className="py-1 px-3 text-xs min-h-auto" style={{ backgroundColor: "#DC2626", color: "white" }} onClick={() => handleDelete(member.id)}>Delete</Button>
              </div>
            </div>
          ))}
          {staff.length === 0 && <p className="p-5 text-mutedText">No staff members found.</p>}
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-heading text-2xl">{editingStaff ? "Edit Staff" : "Add New Staff"}</h3>
            <div className="space-y-4">
              <InputField 
                label="Full Name" 
                value={form.full_name} 
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
              />
              <InputField 
                label="Email Address" 
                type="email"
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
              />
              <InputField 
                label="Phone Number" 
                type="tel"
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              />
              <SelectField 
                label="Role" 
                value={form.role} 
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                options={[
                  { label: "Receptionist", value: "receptionist" },
                  { label: "Housekeeping", value: "housekeeping" },
                  { label: "Manager", value: "manager" }
                ]}
              />
              {!editingStaff && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">Password (Leave empty to auto-generate)</label>
                  <InputField 
                    type="password"
                    placeholder="Leave blank for secure auto-generated password"
                    value={form.password} 
                    onChange={(e) => setForm({ ...form, password: e.target.value })} 
                  />
                  <p className="mt-1 text-xs text-mutedText">
                    Password must be at least 8 characters with uppercase, lowercase, and number. Housekeeping staff are assigned by reception and do not use a separate portal.
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingStaff ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Display Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-heading text-2xl">Staff Account Created</h3>
            <div className="space-y-4 rounded-lg bg-blue-50 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">Name</p>
                <p className="text-lg font-semibold">{passwordModal.name}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Email</p>
                <p className="font-mono text-sm">{passwordModal.email}</p>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-semibold text-gray-600">Temporary Password</p>
                <div className="mt-2 flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={passwordModal.password}
                    className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm font-bold"
                  />
                  <Button 
                    onClick={() => {
                      navigator.clipboard.writeText(passwordModal.password);
                      toast.success("Password copied to clipboard");
                    }}
                    variant="outline"
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-yellow-50 p-3">
                <p className="text-xs font-semibold text-yellow-800">⚠️ Important</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Share this password securely with the staff member. They must change it after first login. This password is also sent to their email.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setPasswordModal(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
