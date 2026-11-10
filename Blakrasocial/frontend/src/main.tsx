import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import "@/shared/i18n";
import "./index.css";

import { builtinSession } from "@/shared/auth/builtinSession";
import { CallbackSessionProvider, configureSession, registerBuiltin } from "@/shared/auth/session";

/** Optional host integration: a platform that embeds this app defines
 *  `window.BlakrasocialConfig = { getAccessToken }` before this script loads and returns a short-lived
 *  JWT it issued. Without it, the app uses its own sign-in (email + password, invite links). */
declare global {
  interface Window {
    BlakrasocialConfig?: { getAccessToken: () => Promise<string> };
  }
}
registerBuiltin(builtinSession);
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
