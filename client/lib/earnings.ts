import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { apiRequest } from "./api-request";

export interface ContributorEarnings {
  availableBalance: number;
  pendingEarnings: number;
  totalWithdrawn: number;
  paymentGatewayConfigured: boolean;
  isLoading: boolean;
}

const defaultEarnings: Omit<ContributorEarnings, "isLoading"> = {
  availableBalance: 0,
  pendingEarnings: 0,
  totalWithdrawn: 0,
  paymentGatewayConfigured: false,
};

export function useContributorEarnings(session: Session | null): ContributorEarnings {
  const [earnings, setEarnings] = useState(defaultEarnings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user.id) {
      setEarnings(defaultEarnings);
      setIsLoading(false);
      return;
    }

    let active = true;
    const loadEarnings = async () => {
      try {
        const result = await apiRequest<Omit<ContributorEarnings, "isLoading">>("/api/contributor/earnings");
        if (active) setEarnings(result);
      } catch {
        if (active) setEarnings(defaultEarnings);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadEarnings();
    const interval = window.setInterval(() => void loadEarnings(), 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [session?.user.id]);

  return { ...earnings, isLoading };
}
