import { create } from "zustand";

export const useBookingStore = create((set) => ({
  selection: {
    room: null,
    checkIn: "",
    checkInTime: "",
    checkOut: "",
    guests: 2,
    specialRequests: "",
  },
  guestInfo: {},
  setSelection: (payload) =>
    set((state) => ({
      selection: { ...state.selection, ...payload },
    })),
  setGuestInfo: (payload) =>
    set((state) => ({
      guestInfo: { ...state.guestInfo, ...payload },
    })),
  resetBooking: () =>
    set({
      selection: {
        room: null,
        checkIn: "",
        checkInTime: "",
        checkOut: "",
        guests: 2,
        specialRequests: "",
      },
      guestInfo: {},
    }),
}));

