import { apiRequest } from "./api-request";

export type AdminDashboardStats = {
  users: number;
  applications: number;
  deviceRequests: number;
  availableDevices: number;
};

export function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  return apiRequest<AdminDashboardStats>("/api/admin/dashboard-stats");
}
