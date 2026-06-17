import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { User, Phone, Globe, CreditCard, Hash, Calendar, Users, MessageSquare } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { bookingAPI } from "../../api/bookingAPI";
import { roomAPI } from "../../api/roomAPI";
import { formatCurrency } from "../../utils/formatCurrency";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function WalkInBooking() {
  const [form, setForm] = useState({
    guest_name: "",
    phone: "",
    nationality: "Indian",
    id_type: "national_id",
    id_number: "",
    room_id: "",
    guests: 1,
    check_in: todayDateInput(),
    check_out: "",
    payment_method: "cash",
    special_requests: ""
  });

  const { data: roomsRes, isLoading: roomsLoading } = useQuery({
    queryKey: ["available-rooms-walkin"],
    queryFn: () => roomAPI.getReceptionistRoomGrid(),
  });

  const availableRooms = (roomsRes?.data || []).filter(r => r.status === 'available');
  const selectedRoom = availableRooms.find(r => r.id === Number(form.room_id));

  const walkInMutation = useMutation({
    mutationFn: bookingAPI.walkIn,
    onSuccess: () => {
      toast.success("Walk-in booking created successfully");
      setForm({
        guest_name: "", phone: "", nationality: "Indian", id_type: "national_id",
        id_number: "", room_id: "", guests: 1,
        check_in: todayDateInput(), check_out: "", payment_method: "cash", special_requests: ""
      });
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to create booking")
  });

  const handleCreate = () => {
    if (!form.guest_name || !form.phone || !form.room_id || !form.check_in || !form.check_out) {
      toast.error("Please fill in all required fields (Name, Phone, Room, and Dates)");
      return;
    }

    if (new Date(form.check_in) < new Date(todayDateInput())) {
      toast.error("Check-in date cannot be in the past");
      return;
    }

    if (new Date(form.check_out) <= new Date(form.check_in)) {
      toast.error("Check-out date must be after check-in date");
      return;
    }

    const payload = {
      guest: { 
        full_name: form.guest_name, 
        phone: form.phone,
        nationality: form.nationality,
        id_type: form.id_type,
        id_number: form.id_number
      },
      room_id: Number(form.room_id),
      check_in: form.check_in,
      check_out: form.check_out,
      guests: form.guests,
      payment_method: form.payment_method,
      special_requests: form.special_requests
    };
    walkInMutation.mutate(payload);
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader 
        eyebrow="Walk-in Booking" 
        title="Direct Front-Desk Entry" 
        description="Register a guest and assign a room instantly. All fields marked * are mandatory." 
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Main Form */}
        <div className="space-y-8">
          {/* Guest Identity Card */}
          <div className="section-card p-8">
            <h3 className="text-lg font-bold text-vineyard mb-6 flex items-center gap-2">
              <User size={20} className="text-saffron" /> Guest Information
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <InputField label="Full Name *" placeholder="Guest name" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
              <InputField label="Phone Number *" placeholder="+91 00000 00000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <SelectField 
                label="Nationality"
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                options={[
                    { label: "Indian", value: "Indian" },
                    { label: "Foreigner", value: "Foreigner" }
                  ]}
              />
              <div className="grid grid-cols-2 gap-4">
                 <SelectField 
                  label="ID Type"
                  value={form.id_type}
                  onChange={(e) => setForm({ ...form, id_type: e.target.value })}
                  options={[
                    { label: "National ID", value: "national_id" },
                    { label: "Driving License", value: "driving_license" },
                    { label: "Passport", value: "passport" },
                    { label: "Other", value: "other" }
                  ]}
                />
                <InputField label="ID Number" placeholder="Number" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Room Selection Grid */}
          <div className="section-card p-8 border-goldLight bg-goldLight/10">
            <h3 className="text-lg font-bold text-vineyard mb-6 flex items-center gap-2">
              <BedDouble size={20} className="text-saffron" /> Select Available Room *
            </h3>
            {roomsLoading ? (
              <p className="text-sm text-center py-10">Loading available inventory...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {availableRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setForm({ ...form, room_id: String(room.id) })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      Number(form.room_id) === room.id 
                        ? "border-saffron bg-saffron text-white shadow-lg scale-105" 
                        : "border-divider bg-white hover:border-saffron/50"
                    }`}
                  >
                    <p className="text-xl font-bold font-heading">{room.room_number}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">{room.category}</p>
                  </button>
                ))}
                {availableRooms.length === 0 && (
                  <p className="col-span-full py-10 text-center text-mutedText text-sm italic">No available rooms found for selection.</p>
                )}
              </div>
            )}
          </div>

          {/* Stay & Payment */}
          <div className="section-card p-8">
            <h3 className="text-lg font-bold text-vineyard mb-6 flex items-center gap-2">
               <Calendar size={20} className="text-saffron" /> Stay & Payment Details
            </h3>
            <div className="grid gap-6 md:grid-cols-3">
              <InputField
                label="Check-In *"
                type="date"
                min={todayDateInput()}
                value={form.check_in}
                onChange={(e) => {
                  const nextCheckIn = e.target.value;
                  const nextState = { ...form, check_in: nextCheckIn };
                  if (form.check_out && new Date(form.check_out) <= new Date(nextCheckIn)) {
                    nextState.check_out = "";
                  }
                  setForm(nextState);
                }}
              />
              <InputField
                label="Check-Out *"
                type="date"
                min={form.check_in || todayDateInput()}
                value={form.check_out}
                onChange={(e) => setForm({ ...form, check_out: e.target.value })}
              />
              <InputField label="Guest Count" type="number" min="1" value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })} />
            </div>
            <div className="grid gap-6 md:grid-cols-2 mt-6">
               <SelectField 
                label="Payment Method"
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                options={[
                  { label: "Cash", value: "cash" },
                  { label: "UPI (PhonePe/GPay)", value: "upi" },
                  { label: "Card Swipe", value: "card" }
                ]}
              />
              <InputField label="Special Requests" value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <div className="section-card p-8 h-fit sticky top-6 border-goldLight shadow-elegant">
            <h3 className="font-heading text-xl font-bold text-vineyard mb-6 pb-4 border-b border-divider">Booking Summary</h3>
            {selectedRoom ? (
              <div className="space-y-6">
                <div className="space-y-2">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-mutedText italic">Guest</span>
                      <span className="font-bold text-right">{form.guest_name || "Guest Name TBD"}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-mutedText italic">Room</span>
                      <span className="font-bold bg-goldLight px-2 py-1 rounded text-vineyard">{selectedRoom.room_number}</span>
                   </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-divider border-dashed">
                  <div className="flex justify-between text-sm">
                    <span className="text-mutedText italic">Room Rate</span>
                    <span className="font-bold">{formatCurrency(selectedRoom.base_price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-mutedText italic">Est. Taxes (GST)</span>
                    <span className="font-bold">{formatCurrency(selectedRoom.base_price * 0.12)}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-divider flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-mutedText font-bold uppercase tracking-widest">Total Amount</p>
                    <p className="text-3xl font-black text-vineyard">{formatCurrency(selectedRoom.base_price * 1.12)}</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-saffron mb-1">Pay via {form.payment_method}</span>
                </div>

                <button 
                  onClick={handleCreate}
                  disabled={walkInMutation.isPending}
                  className="w-full bg-[#EF6C00] text-white py-4 rounded-xl font-black text-lg hover:opacity-90 transform hover:scale-[1.02] transition-all disabled:opacity-50"
                  style={{ backgroundColor: "#EF6C00", color: "#ffffff" }}
                >
                  {walkInMutation.isPending ? "Creating..." : "Confirm & Create"}
                </button>
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-mutedText italic text-center gap-4">
                 <BedDouble size={48} className="opacity-10 animate-pulse text-vineyard" />
                 <p className="text-sm">Select an available room from the grid to finalize billing details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Support Icons
const BedDouble = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>
);
