export type ConversationStatus = "active" | "closed";

export type VendorConversation = {
  id: string;
  userId: string;
  paymentRequestId: string;
  deviceId: string;
  deviceName: string;
  deviceModel: string;
  referenceNumber: string;
  userName: string;
  userEmail: string;
  requestStatus: string;
  status: ConversationStatus;
  lastMessage: string | null;
  lastMessageAt: string | null;
  userUnreadCount: number;
  adminUnreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type VendorMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "user" | "admin";
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type ConversationWithMessages = VendorConversation & {
  messages: VendorMessage[];
};

export type CreateConversationInput = {
  paymentRequestId: string;
};
