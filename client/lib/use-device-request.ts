import { useEffect, useState } from "react";
import type { PaymentRequest } from "@shared/payment-requests";
import { listPaymentRequests } from "./payment-requests";

export type DeviceRequestState = {
  request: PaymentRequest | null;
  isLoading: boolean;
  error: string;
  reload: () => void;
};

export function useDeviceRequest(): DeviceRequestState {
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    void listPaymentRequests()
      .then((requests) => {
        if (!isMounted) return;
        setRequest(requests.length > 0 ? requests[0] : null);
        setError("");
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load device status.");
        setRequest(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  return {
    request,
    isLoading,
    error,
    reload: () => setReloadToken((t) => t + 1),
  };
}
