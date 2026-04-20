import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingAPI } from "../api/bookingAPI";
import { transactionAPI } from "../api/transactionAPI";

export function useMyBookings() {
  return useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => bookingAPI.mine(),
  });
}

export function useBookingDetail(id) {
  return useQuery({
    queryKey: ["booking-detail", id],
    queryFn: async () => (await bookingAPI.detail(id)).data,
    enabled: Boolean(id),
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: bookingAPI.create,
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => bookingAPI.cancel(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });
}

export function useCreateExtensionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, payload }) => bookingAPI.requestExtension(bookingId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking-detail", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking-extensions", variables.bookingId] });
    },
  });
}

export function useBookingExtensions(id) {
  return useQuery({
    queryKey: ["booking-extensions", id],
    queryFn: async () => (await bookingAPI.bookingExtensions(id)).data,
    enabled: Boolean(id),
  });
}

export function useExtensionTransactions(bookingId) {
  return useQuery({
    queryKey: ["extension-transactions", bookingId],
    queryFn: async () => {
      const allTransactions = await transactionAPI.mine();
      return {
        data: (allTransactions.data || []).filter((t) => t.booking_id === parseInt(bookingId)),
      };
    },
    enabled: Boolean(bookingId),
  });
}

export function usePayExtensionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, requestId }) => bookingAPI.payExtension(bookingId, requestId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking-detail", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking-extensions", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["extension-transactions", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["customer-transactions"] });
    },
  });
}

export function useConfirmExtensionTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => transactionAPI.confirm(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["extension-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["customer-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["booking-detail"] });
    },
  });
}

export function useDeleteExtensionTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => transactionAPI.delete(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["extension-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["customer-transactions"] });
    },
  });
}

export function useReceptionistExtensionRequests() {
  return useQuery({
    queryKey: ["receptionist-extension-requests"],
    queryFn: () => bookingAPI.listExtensionRequests(),
  });
}

export function useProcessExtensionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, payload }) => bookingAPI.processExtensionRequest(requestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-extension-requests"] });
    },
  });
}
