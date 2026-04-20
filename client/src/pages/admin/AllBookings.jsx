import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { bookingAPI } from "../../api/bookingAPI";
import { formatCurrency } from "../../utils/formatCurrency";

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Checked In", value: "checked_in" },
  { label: "Checked Out", value: "checked_out" },
  { label: "Cancelled", value: "cancelled" },
];

export default function AllBookings() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState({ q: "", status: "" });
  const [detailModal, setDetailModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-bookings", filter],
    queryFn: () => bookingAPI.allAdmin(filter),
  });

  const bookings = res?.data || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => bookingAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-bookings"]);
      toast.success("Booking updated");
      setEditModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: bookingAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-bookings"]);
      toast.success("Booking deleted");
    },
    onError: (e) => toast.error(e.response?.data?.error || "Delete failed"),
  });

  const handleOpenEdit = (booking) => {
    setEditForm({ ...booking });
    setEditModal(booking);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to PERMANENTLY delete this booking?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="All Bookings" 
        title="Full booking ledger" 
        description="Search by guest name, ref, or room. Manage status and check detailed logs." 
      />

      <div className="flex flex-wrap gap-4 items-end section-card p-6">
        <div className="flex-1 min-w-[200px]">
          <InputField 
            label="Search" 
            placeholder="Name, Phone, Ref..." 
            value={filter.q} 
            onChange={(e) => setFilter({ ...filter, q: e.target.value })} 
          />
        </div>
        <div className="w-[180px]">
          <SelectField 
            label="Status" 
            value={filter.status} 
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            options={[{ label: "All Status", value: "" }, ...STATUS_OPTIONS]}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="p-10 text-center">Loading bookings...</p>
      ) : (
        <div className="section-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0A4D34]/5 text-vineyard font-bold text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Ref / Guest</th>
                <th className="px-6 py-4">Stay Dates</th>
                <th className="px-6 py-4">Room</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-divider/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-vineyard">{b.booking_ref}</p>
                    <p className="text-xs text-mutedText">{b.customer?.full_name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <p>{b.check_in}</p>
                    <p className="text-[10px] text-mutedText">to {b.check_out}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {b.room?.room_number} ({b.room?.category})
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold">{formatCurrency(b.total_amount)}</p>
                    <p className="text-[10px] uppercase text-goldDark font-bold">{b.payment_status}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      b.status === "confirmed" ? "bg-green-100 text-green-700" :
                      b.status === "cancelled" ? "bg-red-100 text-red-700" : 
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setDetailModal(b)} className="text-xs font-bold text-goldDark underline">View All</button>
                      <button onClick={() => handleOpenEdit(b)} className="text-xs font-bold text-[#0A4D34] underline">Edit</button>
                      <button onClick={() => handleDelete(b.id)} className="text-xs font-bold text-maroon underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-mutedText">No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex justify-between items-start border-b border-divider pb-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold font-heading text-vineyard">Booking Details</h2>
                <p className="text-mutedText">Ref: {detailModal.booking_ref}</p>
              </div>
              <button onClick={() => setDetailModal(null)} className="text-2xl">&times;</button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <section className="space-y-4">
                <h3 className="font-bold border-b border-divider pb-1 uppercase text-xs tracking-widest">Guest Information</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-mutedText">Full Name:</span> {detailModal.customer?.full_name}</p>
                  <p><span className="text-mutedText">Phone:</span> {detailModal.customer?.phone}</p>
                  <p><span className="text-mutedText">Email:</span> {detailModal.customer?.email}</p>
                  <p><span className="text-mutedText">Nationality:</span> <span className="font-bold text-vineyard">{detailModal.customer?.nationality || "Indian"}</span></p>
                  <p><span className="text-mutedText">ID Type:</span> {detailModal.customer?.id_type}</p>
                  <p><span className="text-mutedText">ID Number:</span> {detailModal.customer?.id_number}</p>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="font-bold border-b border-divider pb-1 uppercase text-xs tracking-widest">Payment Details</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-mutedText">Method:</span> <span className="uppercase">{detailModal.payment_method}</span></p>
                  <p><span className="text-mutedText">Status:</span> <span className="uppercase">{detailModal.payment_status}</span></p>
                  <p><span className="text-mutedText">Transaction ID:</span> <span className="font-mono text-xs">{detailModal.razorpay_payment_id || detailModal.manual_transaction_id || "N/A"}</span></p>
                  {detailModal.payment_proof_url && (
                    <div className="mt-2">
                       <p className="text-mutedText mb-1">Payment Proof:</p>
                       <a href={detailModal.payment_proof_url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-divider">
                          <img src={detailModal.payment_proof_url} alt="Proof" className="max-h-32 w-full object-cover" />
                       </a>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4 md:col-span-2">
                <h3 className="font-bold border-b border-divider pb-1 uppercase text-xs tracking-widest">Stay Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><span className="text-mutedText">Check In:</span> {detailModal.check_in}</p>
                    <p><span className="text-mutedText">Check Out:</span> {detailModal.check_out}</p>
                    <p><span className="text-mutedText">Room:</span> {detailModal.room?.room_number} ({detailModal.room?.category})</p>
                    <p><span className="text-mutedText">Guests:</span> {detailModal.guests}</p>
                </div>
              </section>

              {detailModal.special_requests && (
                <section className="md:col-span-2 bg-divider/20 p-4 rounded-xl">
                  <h4 className="text-xs font-bold uppercase text-mutedText mb-2">Special Requests</h4>
                  <p className="text-sm">{detailModal.special_requests}</p>
                </section>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-divider flex justify-end">
              <Button onClick={() => setDetailModal(null)}>Close View</Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-6">Modify Booking {editModal.booking_ref}</h2>
            <div className="space-y-4">
              <SelectField 
                label="Booking Status" 
                value={editForm.status} 
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                options={STATUS_OPTIONS}
              />
              <SelectField 
                label="Payment Status" 
                value={editForm.payment_status} 
                onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                options={[
                  { label: "Pending", value: "pending" },
                  { label: "Paid", value: "paid" },
                  { label: "Refunded", value: "refunded" }
                ]}
              />
              <InputField 
                label="Manual Transaction ID" 
                value={editForm.manual_transaction_id || ""} 
                onChange={(e) => setEditForm({ ...editForm, manual_transaction_id: e.target.value })} 
              />
              <InputField 
                label="Payment Proof URL" 
                value={editForm.payment_proof_url || ""} 
                onChange={(e) => setEditForm({ ...editForm, payment_proof_url: e.target.value })} 
              />
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate({ id: editModal.id, payload: editForm })}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
