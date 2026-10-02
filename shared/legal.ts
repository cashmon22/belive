export type LegalPolicyKey = "terms" | "privacy" | "cookies" | "contributor-agreement";

export interface LegalPolicy {
  id: string;
  policy_key: LegalPolicyKey;
  title: string;
  content: string;
  version: number;
  effective_date: string;
  acknowledgement_required: boolean;
  is_published?: boolean;
  created_at: string;
}

export interface LegalAcknowledgement {
  policy_id: string;
  acknowledged_at: string;
}
