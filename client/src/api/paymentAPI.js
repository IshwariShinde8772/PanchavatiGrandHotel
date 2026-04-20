export const paymentAPI = {
  getRazorpayOptions({ booking, amount, onSuccess }) {
    return {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || "",
      amount,
      currency: "INR",
      name: "Panchavati Grand",
      description: `Booking ${booking?.booking_ref || ""}`,
      handler: onSuccess,
      theme: { color: "#C8440A" },
    };
  },
};

