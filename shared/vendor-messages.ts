export type ConversationStatus = "active" | "closed";
export type ConversationType = "vendor" | "support";

export type VendorConversation = {
  id: string;
  userId: string;
  conversationType: ConversationType;
  paymentRequestId: string | null;
  deviceId: string | null;
  deviceName: string | null;
  deviceModel: string | null;
  referenceNumber: string | null;
  userName: string;
  userEmail: string;
  requestStatus: string | null;
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
