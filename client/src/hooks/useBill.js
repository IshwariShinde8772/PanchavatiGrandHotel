import { useQuery } from "@tanstack/react-query";
import { billAPI } from "../api/billAPI";

export function useBill(bookingId) {
  return useQuery({
    queryKey: ["bill", bookingId],
    queryFn: async () => (await billAPI.getByBooking(bookingId)).data,
    enabled: Boolean(bookingId),
  });
}

