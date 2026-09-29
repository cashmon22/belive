import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import type { AdminApplicationStatus, VerificationStatus } from "@shared/admin-applications";
import { apiRequest } from "./api-request";

export type MyApplication = {
  id: string;
  status: AdminApplicationStatus;
  verificationStatus: VerificationStatus;
  submittedAt: string;
};

/** Loads the signed-in user's latest contributor application status from the database. */
export function useMyApplication(session: Session | null) {
  return useQuery({
    queryKey: ["my-application", session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => (await apiRequest<{ application: MyApplication | null }>("/api/applications/me")).application,
    refetchInterval: 60_000,
  });
}
