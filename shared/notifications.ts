export type NotificationType =
  | "device_approved"
  | "device_rejected"
  | "new_application"
  | "new_device_request"
  | "new_message"
  | "balance_adjusted";

export type AppNotification = {
  id: string;
  userId: string;
  recipientRole: "user" | "admin";
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  relatedId: string | null;
  isRead: boolean;
  createdAt: string;
};
