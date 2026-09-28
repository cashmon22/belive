export type AdminApplicationStatus = "Under Review" | "Approved" | "Rejected";
export type VerificationStatus = "Verified" | "Not Verified";

export interface AdminApplication {
  id: string;
  applicantName: string;
  email: string;
  phone: string;
  country: string;
  applicationDate: string;
  status: AdminApplicationStatus;
  verificationStatus: VerificationStatus;
  details: Record<string, unknown>;
}

export interface AdminApplicationsResponse {
  applications: AdminApplication[];
  total: number;
}
