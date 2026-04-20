import { useMemo } from "react";
import { useReceptionistExtensionRequests, useProcessExtensionRequest } from "../../hooks/useBookings";
import { formatCurrency } from "../../utils/formatCurrency";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import toast from "react-hot-toast";

export default function ExtensionRequests() {
  const { data: response, isLoading } = useReceptionistExtensionRequests();
  const processRequest = useProcessExtensionRequest();

  const requests = response?.data || [];

  const handleAction = async (requestId, payload) => {
    try {
      await processRequest.mutateAsync({ requestId, payload });
      toast.success("Request updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to update request");
    }
  };

  const groupedRequests = useMemo(() => {
    return requests.reduce((acc, request) => {
      const key = request.status;
      acc[key] = acc[key] || [];
      acc[key].push(request);
      return acc;
    }, {});
  }, [requests]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Extension Requests"
        title="Customer Extension Approvals"
        description="Review extension and postponement requests, approve them with cash or QR payment, or reject when the room is unavailable."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="section-card p-6">
          <h2 className="font-heading text-2xl mb-4">Incoming Requests</h2>
          {isLoading ? (
            <p className="text-mutedText">Loading requests...</p>
          ) : requests.length === 0 ? (
            <p className="text-mutedText">No extension requests at this time.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border rounded-xl p-4 bg-white shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-vineyard">{request.booking.booking_ref}</p>
                      <p className="text-sm text-mutedText">
                        {request.customer?.full_name} • Room {request.booking.room?.room_number}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">
                        {request.status.toUpperCase()}
                      </span>
                      <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">
                        {request.payment_status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-mutedText">Current stay</p>
                      <p className="font-semibold">
                        {request.booking.check_in} → {request.booking.check_out}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-mutedText">Requested stay</p>
                      <p className="font-semibold">
                        {request.requested_from} → {request.requested_to}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-mutedText">Extra charge</p>
                      <p className="font-semibold text-saffron">{formatCurrency(request.extra_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-mutedText">Reason</p>
                      <p className="font-semibold">{request.reason}</p>
                    </div>
                  </div>

                  {request.status === "pending" && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        onClick={() => handleAction(request.id, { action: "approve", payment_method: "cash" })}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={processRequest.isLoading}
                      >
                        Approve (Cash)
                      </Button>
                      <Button
                        onClick={() => handleAction(request.id, { action: "approve", payment_method: "qr" })}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={processRequest.isLoading}
                      >
                        Approve (QR)
                      </Button>
                      <Button
                        onClick={() => handleAction(request.id, { action: "reject", response_text: "Room unavailable for requested dates." })}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={processRequest.isLoading}
                      >
                        Reject
                      </Button>
                    </div>
                  )}

                  {request.status === "approved" && request.payment_status === "pending" && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Awaiting customer payment via QR. Complete the payment when the customer confirms.
                    </div>
                  )}

                  {request.status === "completed" && (
                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      Extension completed and booking updated.
                    </div>
                  )}

                  {request.status === "rejected" && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                      Request rejected. {request.response_text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section-card p-6 bg-slate-50">
          <h3 className="font-heading text-xl mb-4">Request Status Overview</h3>
          <ul className="space-y-3 text-sm text-mutedText">
            <li>
              <strong>Pending:</strong> New extension or postpone requests awaiting review.
            </li>
            <li>
              <strong>Approved:</strong> Receptionist approved with payment pending for QR or cash settlement.
            </li>
            <li>
              <strong>Completed:</strong> Stay dates updated and extra charges applied.
            </li>
            <li>
              <strong>Rejected:</strong> Request denied; customer will receive an email notification.
            </li>
          </ul>
          <div className="mt-6 bg-white border border-divider rounded-xl p-4">
            <p className="text-sm font-medium text-vineyard mb-2">Total requests</p>
            <p className="text-3xl font-bold">{requests.length}</p>
            <div className="mt-4 space-y-2">
              {Object.entries(groupedRequests).map(([status, list]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{status}</span>
                  <span className="font-semibold">{list.length}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
