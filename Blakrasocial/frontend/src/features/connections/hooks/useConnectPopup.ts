import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { accountsApi } from "../api/accountsApi";
import { accountsKey } from "./useAccounts";

const POPUP_FEATURES = "popup=yes,width=520,height=760,noopener=no";

/** Opens the provider's hosted linking page (OAuth happens on each network's own site)
 *  in a popup, then refetches connected accounts when the popup closes. */
export function useConnectPopup() {
  const client = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const open = useCallback(async () => {
    setError(null);
    // Open synchronously so the browser treats it as user-initiated, then navigate it.
    const popup = window.open("about:blank", "blakra-connect", POPUP_FEATURES);
    if (!popup) {
      setError(new Error("popup_blocked"));
      return;
    }
    setIsOpen(true);
    try {
      const { url } = await accountsApi.connectUrl();
      popup.location.href = url;
    } catch (e) {
      popup.close();
      setIsOpen(false);
      setError(e);
      return;
    }
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer.current);
        setIsOpen(false);
        void client.invalidateQueries({ queryKey: accountsKey });
      }
    }, 600);
  }, [client]);

  return { open, isOpen, error };
}
