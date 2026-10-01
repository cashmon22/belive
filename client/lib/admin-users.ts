import type { AdminUser, AdminUsersResponse, AdminUserStatus } from "@shared/admin-users";
import { apiRequest } from "./api-request";

export function listAdminUsers(search: string) {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiRequest<AdminUsersResponse>(`/api/admin/users${query}`);
}

export function getAdminUserDetails(id: string) {
  return apiRequest<AdminUser>(`/api/admin/users/${encodeURIComponent(id)}`);
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
