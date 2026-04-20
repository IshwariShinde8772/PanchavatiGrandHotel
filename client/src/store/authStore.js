import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      bookingRedirectTo: null, // Store booking URL to resume after login
      bookingSession: null, // Store booking state before login
      
      setAuth: ({ token, user }) =>
        set({
          token,
          user,
          isAuthenticated: Boolean(token),
        }),
      
      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),
      
      hasRole: (roles) => roles.includes(get().user?.role),
      
      // Store where user came from for post-login redirect
      setBookingRedirect: (url, bookingState) =>
        set({
          bookingRedirectTo: url,
          bookingSession: bookingState,
        }),
      
      // Clear booking redirect after navigation
      clearBookingRedirect: () =>
        set({
          bookingRedirectTo: null,
          bookingSession: null,
        }),
    }),
    {
      name: "panchavati-auth",
    }
  )
);

