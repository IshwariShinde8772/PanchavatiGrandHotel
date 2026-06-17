export function getApiErrorMessage(error, fallbackMessage = "Something went wrong. Please try again.") {
  const responseData = error?.response?.data || {};
  const fieldErrors = responseData?.details?.fieldErrors || {};
  const firstFieldError = Object.values(fieldErrors).find(
    (messages) => Array.isArray(messages) && messages.length > 0
  )?.[0];

  const candidates = [
    firstFieldError,
    responseData.error,
    responseData.message,
    error?.message,
  ];

  for (const item of candidates) {
    const value = String(item || "").trim();
    if (value && value !== "Request failed with status code 500") {
      return value;
    }
  }

  return fallbackMessage;
}
