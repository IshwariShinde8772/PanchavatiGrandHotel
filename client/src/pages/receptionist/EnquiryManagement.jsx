import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { MessageSquare, RefreshCw, Reply, CheckCircle, Clock } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import { enquiryAPI } from "../../api/enquiryAPI";

export default function EnquiryManagement() {
  const queryClient = useQueryClient();
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [responseText, setResponseText] = useState("");

  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["receptionist-enquiries"],
    queryFn: () => enquiryAPI.receptionistList(),
  });

  const enquiries = res?.data || [];

  const respondMutation = useMutation({
    mutationFn: ({ id, response }) => enquiryAPI.receptionistRespond(id, { response_text: response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-enquiries"] });
      toast.success("Response sent successfully");
      setSelectedEnquiry(null);
      setResponseText("");
    },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to send response"),
  });

  const handleRespond = () => {
    if (!responseText.trim()) {
      toast.error("Please enter a response");
      return;
    }
    respondMutation.mutate({ id: selectedEnquiry.id, response: responseText });
  };

  const pendingEnquiries = enquiries.filter(e => !e.is_responded);
  const respondedEnquiries = enquiries.filter(e => e.is_responded);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Enquiry Management"
        title="Customer Inquiries"
        description="View and respond to customer enquiries and booking requests."
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} className="text-orange-500" />
            <span>{pendingEnquiries.length} Pending</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle size={16} className="text-green-500" />
            <span>{respondedEnquiries.length} Responded</span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="flex items-center gap-2 border-godavari text-godavari"
        >
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enquiry List */}
        <div className="space-y-4">
          <h3 className="font-heading text-lg font-bold text-vineyard">All Enquiries</h3>

          {isLoading ? (
            <div className="section-card p-8 text-center text-mutedText">
              Loading enquiries...
            </div>
          ) : enquiries.length === 0 ? (
            <div className="section-card p-8 text-center text-mutedText">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>No enquiries found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enquiries.map((enquiry) => (
                <div
                  key={enquiry.id}
                  onClick={() => setSelectedEnquiry(enquiry)}
                  className={`section-card p-4 cursor-pointer transition-colors ${
                    selectedEnquiry?.id === enquiry.id ? "ring-2 ring-saffron" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-vineyard">{enquiry.full_name}</h4>
                      {enquiry.is_responded ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <Clock size={16} className="text-orange-500" />
                      )}
                    </div>
                    <span className="text-xs text-mutedText">
                      {new Date(enquiry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-mutedText mb-2">{enquiry.phone}</p>
                  <p className="text-sm line-clamp-2">{enquiry.message}</p>
                  {enquiry.check_in && enquiry.check_out && (
                    <p className="text-xs text-mutedText mt-1">
                      {enquiry.check_in} to {enquiry.check_out}
                      {enquiry.adults && ` • ${enquiry.adults} adults`}
                      {enquiry.room_category && ` • ${enquiry.room_category}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Response Panel */}
        <div>
          <h3 className="font-heading text-lg font-bold text-vineyard mb-4">Respond to Enquiry</h3>

          {selectedEnquiry ? (
            <div className="section-card p-6">
              <div className="mb-6">
                <h4 className="font-bold text-vineyard mb-2">Enquiry Details</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-mutedText">Name</p>
                      <p className="font-semibold">{selectedEnquiry.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-mutedText">Phone</p>
                      <p className="font-semibold">{selectedEnquiry.phone}</p>
                    </div>
                  </div>
                  {selectedEnquiry.email && (
                    <div>
                      <p className="text-sm text-mutedText">Email</p>
                      <p className="font-semibold">{selectedEnquiry.email}</p>
                    </div>
                  )}
                  {selectedEnquiry.check_in && selectedEnquiry.check_out && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-mutedText">Check-in</p>
                        <p className="font-semibold">{selectedEnquiry.check_in}</p>
                      </div>
                      <div>
                        <p className="text-sm text-mutedText">Check-out</p>
                        <p className="font-semibold">{selectedEnquiry.check_out}</p>
                      </div>
                    </div>
                  )}
                  {(selectedEnquiry.adults || selectedEnquiry.room_category) && (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedEnquiry.adults && (
                        <div>
                          <p className="text-sm text-mutedText">Adults</p>
                          <p className="font-semibold">{selectedEnquiry.adults}</p>
                        </div>
                      )}
                      {selectedEnquiry.room_category && (
                        <div>
                          <p className="text-sm text-mutedText">Room Type</p>
                          <p className="font-semibold">{selectedEnquiry.room_category}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-mutedText">Message</p>
                    <p className="font-semibold bg-white p-2 rounded border mt-1">{selectedEnquiry.message}</p>
                  </div>
                </div>
              </div>

              {selectedEnquiry.is_responded ? (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="font-semibold text-green-600">Already Responded</span>
                  </div>
                  <p className="text-sm text-green-700">{selectedEnquiry.response_text}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Your Response</label>
                    <textarea
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-saffron focus:border-transparent"
                      rows={6}
                      placeholder="Type your response to the customer enquiry..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleRespond}
                    disabled={respondMutation.isPending || !responseText.trim()}
                    className="w-full bg-saffron hover:bg-saffron/90 flex items-center justify-center gap-2"
                  >
                    <Reply size={16} />
                    {respondMutation.isPending ? "Sending..." : "Send Response"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="section-card p-8 text-center text-mutedText">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select an enquiry from the list to respond</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}