let checkoutScriptPromise;

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (checkoutScriptPromise) return checkoutScriptPromise;

  checkoutScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    const script = existing || document.createElement("script");

    script.addEventListener("load", () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay Checkout did not initialize"));
    }, { once: true });
    script.addEventListener("error", () => {
      checkoutScriptPromise = null;
      reject(new Error("Unable to load Razorpay Checkout"));
    }, { once: true });

    if (!existing) {
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return checkoutScriptPromise;
}

export async function openRazorpayCheckout(options) {
  const Razorpay = await loadRazorpayCheckout();

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    const checkout = new Razorpay({
      ...options,
      handler: (response) => finish(resolve, response),
      modal: {
        ...(options.modal || {}),
        ondismiss: () => {
          options.modal?.ondismiss?.();
          const error = new Error("Payment cancelled");
          error.code = "RAZORPAY_DISMISSED";
          finish(reject, error);
        },
      },
    });

    checkout.on("payment.failed", (response) => {
      const error = new Error(response.error?.description || "Payment failed");
      error.code = "RAZORPAY_FAILED";
      error.details = response.error;
      finish(reject, error);
    });
    checkout.open();
  });
}
