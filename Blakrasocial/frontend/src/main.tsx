import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import "@/shared/i18n";
import "./index.css";

import { CallbackSessionProvider, configureSession } from "@/shared/auth/session";

/** Host integration: define `window.BlakrasocialConfig = { getAccessToken }` before this script loads.
 *  The host returns a short-lived JWT it issued for the signed-in customer. */
declare global {
  interface Window {
    BlakrasocialConfig?: { getAccessToken: () => Promise<string> };
  }
}
if (window.BlakrasocialConfig?.getAccessToken) {
  configureSession(new CallbackSessionProvider(window.BlakrasocialConfig.getAccessToken));
}

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
