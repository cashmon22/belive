import { useEffect, useState } from "react";
import { useRef } from "react";
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
  const requestSequence = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const load = (initial = false) => {
      const sequence = ++requestSequence.current;
      if (initial) setIsLoading(true);
      void listPaymentRequests()
        .then((requests) => {
          if (!isMounted || sequence !== requestSequence.current) return;
          setRequest(requests.length > 0 ? requests[0] : null);
          setError("");
        })
        .catch((loadError) => {
          if (!isMounted || sequence !== requestSequence.current) return;
          setError(loadError instanceof Error ? loadError.message : "Unable to load device status.");
        })
        .finally(() => {
          if (isMounted && sequence === requestSequence.current) setIsLoading(false);
        });
    };

    load(true);
    const interval = window.setInterval(() => load(), 15_000);
    const refreshOnFocus = () => load();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [reloadToken]);

  return {
    request,
    isLoading,
    error,
    reload: () => setReloadToken((t) => t + 1),
  };
}
