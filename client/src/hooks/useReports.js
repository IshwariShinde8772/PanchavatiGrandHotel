import { useQuery } from "@tanstack/react-query";
import { reportAPI } from "../api/reportAPI";

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await reportAPI.adminDashboard()).data,
  });
}

export function useReceptionistDashboard() {
  return useQuery({
    queryKey: ["receptionist-dashboard"],
    queryFn: async () => (await reportAPI.receptionistDashboard()).data,
  });
}

export function useAdminReport(filters) {
  return useQuery({
    queryKey: ["admin-report", filters],
    queryFn: async () => (await reportAPI.report(filters)).data,
  });
}
