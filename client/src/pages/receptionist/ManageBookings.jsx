import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, RefreshCw, LogIn, LogOut, FileText, User, Calendar, Clock, Edit } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import SelectField from "../../components/forms/SelectField";
import { bookingAPI } from "../../api/bookingAPI";
import { formatCurrency } from "../../utils/formatCurrency";

const STATUS_OPTIONS = [
  { label: "All Status", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Checked In", value: "checked_in" },
  { label: "Checked Out", value: "checked_out" },
  { label: "Cancelled", value: "cancelled" },
];

const TABS = [
  { id: "overview", label: "Overview", icon: User },
  { id: "checkinout", label: "Check-in/Out", icon: LogIn },
  { id: "extend", label: "Extend/Postpone", icon: Calendar },
  { id: "details", label: "Customer Details", icon: FileText },
];

export default function ManageBookings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState({ 
    q: searchParams.get("ref") || "", 
    status: "" 
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [extendData, setExtendData] = useState({ check_out: "", reason: "" });

  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["receptionist-bookings", filter],
    queryFn: () => bookingAPI.receptionistList(filter),
  });

  const bookings = res?.data || [];

  const checkInMutation = useMutation({
    mutationFn: (id) => bookingAPI.checkIn(id, { id_verified: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-bookings"] });
      toast.success("Guest checked in successfully");
    },
    onError: (e) => toast.error(e.response?.data?.error || "Check-in failed"),
  });

  const checkOutMutation = useMutation({
    mutationFn: (id) => bookingAPI.checkOut(id, { payment_status: "paid" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-bookings"] });
      toast.success("Guest checked out successfully");
    },
    onError: (e) => toast.error(e.response?.data?.error || "Check-out failed"),
  });

  const extendBookingMutation = useMutation({
    mutationFn: ({ id, payload }) => bookingAPI.extend(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-bookings"] });
      setExtendData({ check_out: "", reason: "" });
      setActiveTab("overview");
      toast.success(`Booking extended successfully. Extra charges: ${formatCurrency(data.extra_charges)}`);
    },
    onError: (e) => toast.error(e.response?.data?.error || "Extension failed"),
  });

  const handleExtendBooking = () => {
    if (!extendData.check_out || !extendData.reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    extendBookingMutation.mutate({
      id: selectedBooking.id,
      payload: {
        check_out: extendData.check_out,
        reason: extendData.reason,
        payment_method: "cash", // Default to cash for receptionist extensions
      },
    });
  };

  const renderTabContent = () => {
    if (!selectedBooking) {
      return (
        <div className="flex items-center justify-center h-64 text-mutedText">
          <p>Select a booking from the list to view details</p>
        </div>
      );
    }

    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-vineyard mb-2">Guest Information</h3>
                <p><strong>Name:</strong> {selectedBooking.customer?.full_name}</p>
                <p><strong>Phone:</strong> {selectedBooking.customer?.phone}</p>
                <p><strong>Email:</strong> {selectedBooking.customer?.email}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-vineyard mb-2">Booking Details</h3>
                <p><strong>Reference:</strong> {selectedBooking.booking_ref}</p>
                <p><strong>Room:</strong> {selectedBooking.room?.room_number} ({selectedBooking.room?.category})</p>
                <p><strong>Status:</strong> {selectedBooking.status}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-godavari">{selectedBooking.nights}</p>
                <p className="text-sm text-mutedText">Nights</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-godavari">{selectedBooking.guests}</p>
                <p className="text-sm text-mutedText">Guests</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-saffron">{formatCurrency(selectedBooking.total_amount)}</p>
                <p className="text-sm text-mutedText">Total Amount</p>
              </div>
            </div>
          </div>
        );

      case "checkinout":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold text-vineyard mb-4 flex items-center gap-2">
                  <LogIn size={20} /> Check-in
                </h3>
                <div className="space-y-3 mb-4">
                  <p><strong>Check-in Date:</strong> {selectedBooking.check_in}</p>
                  <p><strong>Room:</strong> {selectedBooking.room?.room_number}</p>
                  <p><strong>Status:</strong> {selectedBooking.status}</p>
                </div>
                {selectedBooking.status === "confirmed" && (
                  <Button 
                    onClick={() => checkInMutation.mutate(selectedBooking.id)}
                    className="w-full bg-godavari hover:bg-godavari/90"
                    disabled={checkInMutation.isPending}
                  >
                    {checkInMutation.isPending ? "Checking in..." : "Check-in Guest"}
                  </Button>
                )}
                {selectedBooking.status === "checked_in" && (
                  <div className="text-green-600 font-semibold">✓ Guest is checked in</div>
                )}
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold text-vineyard mb-4 flex items-center gap-2">
                  <LogOut size={20} /> Check-out
                </h3>
                <div className="space-y-3 mb-4">
                  <p><strong>Check-out Date:</strong> {selectedBooking.check_out}</p>
                  <p><strong>Room:</strong> {selectedBooking.room?.room_number}</p>
                  <p><strong>Status:</strong> {selectedBooking.status}</p>
                </div>
                {selectedBooking.status === "checked_in" && (
                  <Button 
                    onClick={() => checkOutMutation.mutate(selectedBooking.id)}
                    className="w-full bg-saffron hover:bg-saffron/90"
                    disabled={checkOutMutation.isPending}
                  >
                    {checkOutMutation.isPending ? "Checking out..." : "Check-out Guest"}
                  </Button>
                )}
                {selectedBooking.status === "checked_out" && (
                  <div className="text-blue-600 font-semibold">✓ Guest has checked out</div>
                )}
              </div>
            </div>
          </div>
        );

      case "extend":
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold text-vineyard mb-4 flex items-center gap-2">
                <Calendar size={20} /> Extend/Postpone Booking
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Current Check-out</label>
                  <p className="text-lg font-semibold">{selectedBooking.check_out}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Check-out Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg"
                    value={extendData.check_out}
                    onChange={(e) => setExtendData({ ...extendData, check_out: e.target.value })}
                    min={selectedBooking.check_out}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                  placeholder="Reason for extension..."
                  value={extendData.reason}
                  onChange={(e) => setExtendData({ ...extendData, reason: e.target.value })}
                />
              </div>
              <Button 
                onClick={handleExtendBooking}
                className="w-full bg-vineyard hover:bg-vineyard/90"
              >
                Extend Booking
              </Button>
            </div>
          </div>
        );

      case "details":
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold text-vineyard mb-4">Customer Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-mutedText">Full Name</label>
                    <p className="font-semibold">{selectedBooking.customer?.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mutedText">Phone</label>
                    <p className="font-semibold">{selectedBooking.customer?.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mutedText">Email</label>
                    <p className="font-semibold">{selectedBooking.customer?.email || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mutedText">Nationality</label>
                    <p className="font-semibold">{selectedBooking.customer?.nationality || "Not provided"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-mutedText">ID Type</label>
                    <p className="font-semibold">{selectedBooking.customer?.id_type || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mutedText">ID Number</label>
                    <p className="font-semibold">{selectedBooking.customer?.id_number || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mutedText">ID Expiry</label>
                    <p className="font-semibold">{selectedBooking.customer?.id_expiry || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mutedText">Special Requests</label>
                    <p className="font-semibold">{selectedBooking.special_requests || "None"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Bookings Management" 
        title="Check-in / Check-out Desk" 
        description="Search by guest name or room. Manage arrivals, departures, and generate tax invoices." 
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Booking List */}
        <div className="lg:col-span-1">
          <div className="section-card p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mutedText" size={18} />
              <input 
                type="text"
                placeholder="Search by name, phone, room..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-divider focus:border-saffron outline-none text-sm"
                value={filter.q}
                onChange={(e) => setFilter({ ...filter, q: e.target.value })}
              />
            </div>
            <div className="w-full mb-4">
              <SelectField 
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                options={STATUS_OPTIONS}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              className="w-full flex items-center justify-center gap-2 border-godavari text-godavari mb-4"
            >
              <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /> Refresh
            </Button>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {isLoading ? (
                <p className="p-4 text-center text-mutedText">Loading bookings...</p>
              ) : bookings.map((b) => (
                <button 
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className={`w-full p-3 text-left transition-colors rounded-lg border ${
                    selectedBooking?.id === b.id 
                      ? "bg-green-50 border-godavari" 
                      : "bg-white border-divider hover:bg-gray-50"
                  }`}
                >
                  <p className="font-bold text-vineyard text-sm">{b.customer?.full_name}</p>
                  <p className="text-[10px] text-mutedText">Room {b.room?.room_number} - {b.room?.category}</p>
                  <p className="text-xs font-semibold text-saffron">{formatCurrency(b.total_amount)}</p>
                </button>
              ))}
              {bookings.length === 0 && !isLoading && (
                <p className="p-4 text-center text-mutedText italic">No bookings found</p>
              )}
            </div>
          </div>
        </div>

        {/* Booking Details */}
        <div className="lg:col-span-2">
          <div className="section-card">
            {/* Tabs */}
            <div className="border-b border-divider">
              <div className="flex">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? "border-saffron text-saffron"
                          : "border-transparent text-mutedText hover:text-vineyard"
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {renderTabContent()}
            </div>

            {/* Action Buttons */}
            {selectedBooking && (
              <div className="border-t border-divider p-6">
                <div className="flex gap-3">
                  <Button 
                    onClick={() => navigate(`/receptionist/bill-generator?ref=${selectedBooking.booking_ref}`)}
                    className="flex items-center gap-2 bg-white border border-divider text-mutedText hover:bg-gray-50"
                  >
                    <FileText size={16} /> Generate Bill
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
