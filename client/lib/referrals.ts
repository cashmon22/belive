import { apiRequest } from "./api-request";
import type { ContributorReferralSummary } from "@shared/referrals";

export function getContributorReferrals() {
  return apiRequest<ContributorReferralSummary>("/api/contributor/referrals");
}
