import axiosInstance from "./axiosInstance";

export const reportAPI = {
  adminDashboard: () => axiosInstance.get("/admin/dashboard").then((res) => res.data),
  receptionistDashboard: () => axiosInstance.get("/receptionist/dashboard").then((res) => res.data),
  report: (params) => axiosInstance.get("/admin/reports", { params }).then((res) => res.data),
  exportCsv: () =>
    axiosInstance
      .get("/admin/reports/bookings.csv", { responseType: "blob" })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `bookings-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }),
};

