import { useMutation, useQuery } from "@tanstack/react-query";
import { authAPI } from "../api/authAPI";
import { useAuthStore } from "../store/authStore";

export function useAuthProfile(enabled = true) {
  return useQuery({
    queryKey: ["auth-profile"],
    queryFn: async () => (await authAPI.me()).data,
    enabled,
  });
}

export function useLoginMutation() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (payload) => {
      if (payload.phone && payload.otp && !payload.email) {
        return authAPI.verifyOtp({
          phone: payload.phone,
          otp: payload.otp,
        });
      }

      return authAPI.login({
        email: payload.email,
        password: payload.password,
      });
    },
    onSuccess: (response) => {
      // API returns { success: true, data: { token, user } }
      const payload = response?.data ?? response;
      setAuth({ token: payload.token, user: payload.user });
    },
  });
}
