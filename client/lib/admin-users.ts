import type { AdminUser, AdminUsersResponse, AdminUserStatus } from "@shared/admin-users";
import { apiRequest } from "./api-request";
import type { AdminContributorOverview } from "@shared/admin-users";

export interface CreatedAdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export function createAdminUser(input: { email: string; password: string; fullName?: string }) {
  return apiRequest<CreatedAdminUser>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listAdminUsers(search: string) {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiRequest<AdminUsersResponse>(`/api/admin/users${query}`);
}

export function getAdminUserDetails(id: string) {
  return apiRequest<AdminUser>(`/api/admin/users/${encodeURIComponent(id)}`);
}

export function getAdminContributorOverview(id: string) {
  return apiRequest<AdminContributorOverview>(`/api/admin/users/${encodeURIComponent(id)}/overview`);
}

export function deleteAdminUser(id: string) {
  return apiRequest<{ id: string }>(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function updateAdminUserStatus(id: string, status: AdminUserStatus) {
  return apiRequest<AdminUser>(`/api/admin/users/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
