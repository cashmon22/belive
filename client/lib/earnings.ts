import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

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

export function useContributorEarnings(
  session: Session | null,
): ContributorEarnings {
  const [earnings, setEarnings] =
    useState<Omit<ContributorEarnings, "isLoading">>(defaultEarnings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setEarnings(defaultEarnings);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("contributor_earnings")
          .select(
            "available_balance, pending_earnings, total_withdrawn, payment_gateway_configured",
          )
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (error || !data) {
          setEarnings(defaultEarnings);
        } else {
          setEarnings({
            availableBalance: Number(data.available_balance) || 0,
            pendingEarnings: Number(data.pending_earnings) || 0,
            totalWithdrawn: Number(data.total_withdrawn) || 0,
            paymentGatewayConfigured: Boolean(data.payment_gateway_configured),
          });
        }
      } catch {
        if (isMounted) setEarnings(defaultEarnings);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  return { ...earnings, isLoading };
}
