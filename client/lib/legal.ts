import { apiRequest } from "./api-request";
import type { LegalAcknowledgement, LegalPolicy } from "@shared/legal";

export async function getPublicPolicies() {
  const response = await fetch("/api/legal/policies");
  const result = await response.json().catch(() => null) as { policies?: LegalPolicy[]; error?: string } | null;
  if (!response.ok) throw new Error(result?.error ?? "Unable to load policies.");
  return result?.policies ?? [];
}

export function getAdminPolicies() {
  return apiRequest<{ policies: LegalPolicy[] }>("/api/admin/legal/policies");
}

export function saveAdminPolicy(policy: {
  id?: string;
  policy_key: LegalPolicy["policy_key"];
  title: string;
  content: string;
  version: number;
  effective_date: string;
  is_published?: boolean;
  acknowledgement_required: boolean;
}) {
  return apiRequest<{ success: boolean }>("/api/admin/legal/policies", {
    method: "POST",
    body: JSON.stringify({
      id: policy.id,
      key: policy.policy_key,
      title: policy.title,
      content: policy.content,
      version: policy.version,
      effectiveDate: policy.effective_date,
      isPublished: policy.is_published,
      acknowledgementRequired: policy.acknowledgement_required,
    }),
  });
}

export function getMyPolicyAcknowledgements() {
  return apiRequest<{ policies: LegalPolicy[]; acknowledgements: LegalAcknowledgement[] }>("/api/legal/acknowledgements");
}

export function acknowledgePolicy(policyId: string) {
  return apiRequest<{ success: boolean }>("/api/legal/acknowledgements", {
    method: "POST",
    body: JSON.stringify({ policyId }),
  });
}
