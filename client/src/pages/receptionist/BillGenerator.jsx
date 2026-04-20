import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Search, Download } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { bookingAPI } from "../../api/bookingAPI";
import { formatCurrency } from "../../utils/formatCurrency";

export default function BillGenerator() {
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("ref") || "");
  const [selectedBooking, setSelectedBooking] = useState(null);

  const { data: bRes, isLoading } = useQuery({
    queryKey: ["receptionist-bill-search", q],
    queryFn: () => bookingAPI.receptionistList({ q }),
  });

  const bookings = bRes?.data || [];

  const handleDownload = () => {
    const printContent = document.getElementById('printable-bill');
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    const printStyles = `
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 1cm; }
        }
      </style>
    `;

    document.body.innerHTML = printStyles + printContent.outerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Reload to restore React state
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader 
        eyebrow="Bill Generator" 
        title="Tax Invoice Terminal" 
        description="Select a completed stay or checked-in guest to generate their final tax invoice." 
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_450px]">
        {/* Selection List */}
        <div className="section-card flex flex-col h-[700px]">
          <div className="p-6 border-b border-divider">
            <h3 className="font-heading text-lg font-bold text-vineyard mb-4">Select Booking</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mutedText" size={18} />
              <input 
                type="text"
                placeholder="Search guest or room..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-divider focus:border-godavari outline-none text-sm"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-divider">
            {isLoading ? (
               <p className="p-10 text-center text-mutedText">Searching...</p>
            ) : bookings.map((b) => (
              <button 
                key={b.id}
                onClick={() => setSelectedBooking(b)}
                className={`w-full p-6 text-left transition-colors hover:bg-gray-50 flex justify-between items-center ${
                  selectedBooking?.id === b.id ? "bg-green-50 border-l-4 border-godavari" : "border-l-4 border-transparent"
                }`}
              >
                <div>
                  <p className="font-bold text-vineyard">{b.customer?.full_name}</p>
                  <p className="text-[10px] text-mutedText">Room {b.room?.room_number} - {b.room?.category}</p>
                </div>
                <p className="font-bold text-sm">{formatCurrency(b.total_amount)}</p>
              </button>
            ))}
            {bookings.length === 0 && !isLoading && (
               <p className="p-10 text-center text-mutedText italic">Enter a name or reference to find bookings.</p>
            )}
          </div>
        </div>

        {/* Bill Preview */}
        <div className="section-card flex flex-col overflow-hidden h-[700px]">
          <div className="p-6 border-b border-divider bg-gray-50/50">
             <h3 className="font-heading text-lg font-bold text-vineyard">Bill Preview</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-10 bg-white">
            {selectedBooking ? (
              <div id="printable-bill" className="max-w-md mx-auto space-y-8 text-vineyard">
                <div className="text-center border-b-2 border-divider pb-6">
                   <h2 className="text-2xl font-black uppercase tracking-tighter">Panchavati Hotel, Nashik</h2>
                   <p className="text-[10px] text-mutedText font-bold uppercase tracking-widest mt-1">Near Ramkund Ghat, Panchavati, Nashik, Maharashtra 422003</p>
                   <p className="text-[10px] font-bold text-saffron mt-4 uppercase">Tax Invoice • {selectedBooking.booking_ref}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-8 border-b border-divider pb-6">
                   <div>
                      <p className="text-mutedText italic text-xs mb-1">Guest</p>
                      <p className="font-bold">{selectedBooking.customer?.full_name}</p>
                   </div>
                   <div>
                      <p className="text-mutedText italic text-xs mb-1">Phone</p>
                      <p className="font-bold">{selectedBooking.customer?.phone}</p>
                   </div>
                   <div>
                      <p className="text-mutedText italic text-xs mb-1">Room</p>
                      <p className="font-bold">{selectedBooking.room?.room_number} ({selectedBooking.room?.category})</p>
                   </div>
                   <div>
                      <p className="text-mutedText italic text-xs mb-1">Stay</p>
                      <p className="font-bold">{selectedBooking.nights} Nights</p>
                   </div>
                   <div>
                      <p className="text-mutedText italic text-xs mb-1">Check-in</p>
                      <p className="font-bold">{selectedBooking.check_in}</p>
                   </div>
                   <div>
                      <p className="text-mutedText italic text-xs mb-1">Check-out</p>
                      <p className="font-bold">{selectedBooking.check_out}</p>
                   </div>
                </div>

                <div className="pt-6 space-y-3">
                   <div className="flex justify-between text-sm">
                      <span className="text-mutedText italic">Subtotal</span>
                      <span className="font-bold">{formatCurrency(selectedBooking.total_fare)}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-mutedText italic">GST ({selectedBooking.gst_percent}%)</span>
                      <span className="font-bold">{formatCurrency(selectedBooking.gst_amount)}</span>
                   </div>
                   {Number(selectedBooking.extra_charges) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-mutedText italic">Extra Charges</span>
                        <span className="font-bold">{formatCurrency(selectedBooking.extra_charges)}</span>
                      </div>
                   )}
                   <div className="flex justify-between items-center pt-4 border-t-2 border-vineyard">
                      <span className="text-lg font-black uppercase">Total</span>
                      <span className="text-2xl font-black">{formatCurrency(selectedBooking.total_amount)}</span>
                   </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-mutedText italic">
                 <p className="text-center">Search and select a guest booking from the left list to generate a preview.</p>
              </div>
            )}
          </div>
          {selectedBooking && (
            <div className="p-6 bg-gray-50 border-t border-divider">
               <button 
                  onClick={handleDownload}
                  className="w-full bg-saffron text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90"
               >
                  <Download size={20} /> Download PDF
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
