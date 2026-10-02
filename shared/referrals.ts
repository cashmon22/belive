export type ReferralStatus = "Pending" | "Successful" | "Rejected";

export interface ContributorReferral {
  id: string;
  referredContributor: string;
  date: string;
  status: ReferralStatus;
  reward: number | null;
}

export interface ContributorReferralSummary {
  code: string;
  total: number;
  successful: number;
  pending: number;
  history: ContributorReferral[];
}
