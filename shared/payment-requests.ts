export type PaymentRequestStatus = "Under Review" | "Approved" | "Rejected" | "Completed";

export type PaymentRequest = {
  id: string;
  userId: string;
  fullLegalName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  deviceId: string;
  deviceName: string;
  deviceModel: string;
  deviceAmount: number | null;
  currency: string;
  vendor: string;
  status: PaymentRequestStatus;
  createdAt: string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
};

export type CreatePaymentRequestInput = {
  deviceId: string;
  fullLegalName: string;
  phone: string;
  deliveryAddress: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  additionalNotes?: string;
  confirmation: boolean;
};
