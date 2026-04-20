import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import { adminAPI } from "../../api/adminAPI";

export default function Customers() {
  const navigate = useNavigate();
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Fetch customers
  const { data: response, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => adminAPI.listCustomers(),
  });

  // Fetch selected customer details
  const { data: detailResponse } = useQuery({
    queryKey: ["admin-customer-detail", selectedCustomer?.id],
    queryFn: () => adminAPI.getCustomerDetail(selectedCustomer?.id),
    enabled: Boolean(selectedCustomer?.id),
  });

  const customers = response?.data || [];

  const getCheckInStatus = (customer) => {
    // Get most recent booking to check if currently checked in
    if (detailResponse?.data?.bookings && detailResponse.data.bookings.length > 0) {
      const recent = detailResponse.data.bookings[0];
      if (recent.status === "checked_in") {
        return "checked_in";
      }
    }
    return "guest";
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Customers" 
        title="Guest profiles and spend summary" 
        description="See repeat guests, total bookings, nationality mix, and check-in status." 
      />

      {isLoading ? (
        <div className="section-card p-8 text-center text-mutedText">
          Loading customers...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customers List */}
          <div className="lg:col-span-2">
            <div className="section-card divide-y divide-divider overflow-hidden">
              {customers.length === 0 ? (
                <div className="p-8 text-center text-mutedText">
                  No customers found
                </div>
              ) : (
                customers.map((customer) => (
                  <div 
                    key={customer.id} 
                    className="p-5 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg">{customer.full_name}</p>
                          {getCheckInStatus(customer) === "checked_in" && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              Checked In
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-mutedText mt-1">{customer.phone}</p>
                        <p className="text-sm text-mutedText">{customer.email}</p>
                        <div className="mt-3 flex gap-4 text-sm">
                          <span className="text-mutedText">
                            Country: <span className="font-semibold">{customer.nationality || "Not specified"}</span>
                          </span>
                          <span className="text-mutedText">
                            Bookings: <span className="font-semibold">{customer.total_bookings}</span>
                          </span>
                          <span className="text-mutedText">
                            Spent: <span className="font-semibold">INR {customer.total_spent?.toLocaleString()}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex flag-shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(customer);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Customer Details Panel */}
          {selectedCustomer && (
            <div className="lg:col-span-1">
              <div className="section-card sticky top-20 p-6 space-y-6">
                <div>
                  <h3 className="font-heading text-xl mb-4">{selectedCustomer.full_name}</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-mutedText">Phone</p>
                      <p className="font-semibold">{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <p className="text-mutedText">Email</p>
                      <p className="font-semibold break-all">{selectedCustomer.email || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-mutedText">Nationality</p>
                      <p className="font-semibold">{selectedCustomer.nationality || "Not specified"}</p>
                    </div>
                    {selectedCustomer.id_type && (
                      <div>
                        <p className="text-mutedText">ID Type</p>
                        <p className="font-semibold capitalize">{selectedCustomer.id_type}</p>
                      </div>
                    )}
                    {selectedCustomer.id_number && (
                      <div>
                        <p className="text-mutedText">ID Number</p>
                        <p className="font-semibold">{selectedCustomer.id_number}</p>
                      </div>
                    )}
                    <div className="pt-3 border-t border-divider">
                      <p className="text-mutedText">Total Bookings</p>
                      <p className="font-semibold text-lg">{selectedCustomer.total_bookings}</p>
                    </div>
                    <div>
                      <p className="text-mutedText">Total Spent</p>
                      <p className="font-semibold text-lg">INR {selectedCustomer.total_spent?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Booking History */}
                {detailResponse?.data?.bookings && detailResponse.data.bookings.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Recent Bookings</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {detailResponse.data.bookings.slice(0, 5).map((booking) => (
                        <div key={booking.id} className="text-sm p-2 bg-gray-50 rounded-lg">
                          <p className="font-semibold">{booking.booking_ref}</p>
                          <p className="text-mutedText text-xs">
                            {booking.check_in} to {booking.check_out}
                          </p>
                          <p className="text-mutedText text-xs">
                            Status: <span className="capitalize font-semibold">{booking.status}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

