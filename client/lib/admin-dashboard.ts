import { apiRequest } from "./api-request";

export type AdminDashboardStats = {
  users: number;
  applications: number;
  pendingApplications: number;
  deviceRequests: number;
  pendingDeviceRequests: number;
  activeConversations: number;
  availableDevices: number;
  availableBalance: number;
  pendingEarnings: number;
};

export function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  return apiRequest<AdminDashboardStats>("/api/admin/dashboard-stats");
}
