import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Platform } from "@/shared/api/types";
import { accountsApi } from "../api/accountsApi";
import { accountsKey } from "./useAccounts";

const POPUP_FEATURES = "popup=yes,width=520,height=760,noopener=no";

/** Opens the network's own login and consent page in a popup (we never see the password),
 *  then refetches connected accounts when the popup closes. */
export function useConnectPopup() {
  const client = useQueryClient();
  const [openFor, setOpenFor] = useState<Platform | null>(null);
  const [error, setError] = useState<unknown>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const open = useCallback(async (platform: Platform) => {
    setError(null);
    // Open synchronously so the browser treats it as user-initiated, then navigate it.
    const popup = window.open("about:blank", "blakra-connect", POPUP_FEATURES);
    if (!popup) {
      setError(new Error("popup_blocked"));
      return;
    }
    setOpenFor(platform);
    try {
      const { url } = await accountsApi.connectUrl(platform);
      popup.location.href = url;
    } catch (e) {
      popup.close();
      setOpenFor(null);
      setError(e);
      return;
    }
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer.current);
        setOpenFor(null);
        void client.invalidateQueries({ queryKey: accountsKey });
      }
    }, 600);
  }, [client]);

  return { open, isOpen: openFor !== null, openFor, error };
}
