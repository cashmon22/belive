export type AdminUserStatus = "Active" | "Suspended";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: AdminUserStatus;
  lastSignInAt: string | null;
  isAdmin: boolean;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
}

export interface AdminContributorOverview {
  phone: string | null;
  application: {
    fullName: string;
    email: string;
    phone: string;
    status: string;
    verificationStatus: string;
    submittedAt: string;
  } | null;
  deviceRequests: Array<{
    id: string;
    deviceName: string;
    deviceModel: string;
    status: string;
    createdAt: string;
  }>;
  tasks: Array<{
    id: string;
    assignmentId: string;
    title: string;
    category: string;
    status: string;
    createdAt: string;
    reward: number;
  }>;
  earnings: {
    availableBalance: number;
    pendingEarnings: number;
    totalWithdrawn: number;
  } | null;
  conversations: Array<{
    id: string;
    type: "support" | "vendor";
    status: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
  }>;
}
