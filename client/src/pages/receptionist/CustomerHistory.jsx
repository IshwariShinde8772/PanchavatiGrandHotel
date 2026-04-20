import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import { bookingAPI } from "../../api/bookingAPI";

export default function CustomerHistory() {
  const queryClient = useQueryClient();
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Fetch history
  const { data, isLoading } = useQuery({
    queryKey: ["receptionist-customer-history"],
    queryFn: () => bookingAPI.receptionistList({ status: "checked_out" }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => bookingAPI.delete(id),
    onSuccess: () => {
      toast.success("Record deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["receptionist-customer-history"] });
      setShowDeleteConfirm(false);
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to delete record");
    },
  });

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const trips = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Customer History" 
        title="Recent guest stay history" 
        description="Reception can quickly reference past trips, repeat guests, and completed stays." 
      />

      {selectedTrip && (
        <div className="section-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-xl">Trip Details - {selectedTrip.booking_ref}</h3>
            <button onClick={() => setSelectedTrip(null)} className="text-mutedText hover:text-black">✕</button>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-mutedText">Guest Name</p>
                <p className="font-semibold">{selectedTrip.customer?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">Phone</p>
                <p className="font-semibold">{selectedTrip.customer?.phone}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">Email</p>
                <p className="font-semibold break-all">{selectedTrip.customer?.email}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">Nationality</p>
                <p className="font-semibold">{selectedTrip.customer?.nationality}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-mutedText">Room</p>
                <p className="font-semibold">{selectedTrip.room?.name} (#{selectedTrip.room?.room_number})</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">Dates</p>
                <p className="font-semibold">{selectedTrip.check_in} to {selectedTrip.check_out}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">Payment Status</p>
                <p className="font-semibold capitalize">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedTrip.payment_status === "paid" ? "bg-green-100 text-green-700" :
                    selectedTrip.payment_status === "paid_at_hotel" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {selectedTrip.payment_status}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-mutedText">Amount</p>
                <p className="font-semibold">INR {selectedTrip.total_amount}</p>
              </div>
            </div>
          </div>

          {selectedTrip.payment_proof_url && (
            <div className="mt-6 pt-6 border-t border-divider">
              <h4 className="font-semibold mb-3">Payment Proof</h4>
              <a 
                href={selectedTrip.payment_proof_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block"
              >
                <img 
                  src={selectedTrip.payment_proof_url} 
                  alt="Payment Proof" 
                  className="max-w-xs max-h-64 rounded-lg border border-divider"
                />
              </a>
            </div>
          )}
        </div>
      )}

      <div className="section-card divide-y divide-divider overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-mutedText">Loading history...</p>
        ) : trips.length === 0 ? (
          <p className="p-5 text-mutedText">No completed guest history yet.</p>
        ) : (
          trips.map((trip) => (
            <div key={trip.id} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 grid gap-3 md:grid-cols-5">
                  <div>
                    <p className="font-semibold">{trip.booking_ref}</p>
                    <p className="text-sm text-mutedText">{trip.customer?.full_name}</p>
                  </div>
                  <div>
                    <p>{trip.room?.room_number}</p>
                    <p className="text-xs text-mutedText">{trip.room?.category}</p>
                  </div>
                  <p className="text-sm">{trip.check_in}</p>
                  <p className="text-sm">{trip.check_out}</p>
                  <p className="text-sm capitalize">{trip.status}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedTrip(trip)}
                  >
                    View
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleDelete(trip.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm">
            <h3 className="font-heading text-xl mb-2">Delete Record?</h3>
            <p className="text-mutedText mb-6">
              Are you sure you want to delete this history record? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="secondary"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
