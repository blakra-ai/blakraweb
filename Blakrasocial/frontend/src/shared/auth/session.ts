/** How the app gets credentials. The host platform owns login; we only consume its tokens.
 *
 *  Embedding apps call `configureSession()` once with a provider that returns a fresh,
 *  short-lived access token (e.g. from their auth SDK). The customer's profile key is read
 *  from the token's claims, so it always matches what the backend verifies. */
export interface SessionProvider {
  getAccessToken(): Promise<string>;
  getProfileKey(token: string): string;
}

const PROFILE_CLAIM = import.meta.env.VITE_PROFILE_KEY_CLAIM || "profile_key";

export function profileKeyFromToken(token: string, claim: string = PROFILE_CLAIM): string {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Malformed access token");
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  const value = (JSON.parse(json) as Record<string, unknown>)[claim];
  if (typeof value !== "string" || !value) throw new Error(`Access token has no '${claim}' claim`);
  return value;
}

export class CallbackSessionProvider implements SessionProvider {
  constructor(private readonly fetchToken: () => Promise<string>) {}

  getAccessToken(): Promise<string> {
    return this.fetchToken();
  }

  getProfileKey(token: string): string {
    return profileKeyFromToken(token);
  }
}

class DevEnvSessionProvider extends CallbackSessionProvider {
  constructor() {
    super(async () => {
      const token = import.meta.env.VITE_DEV_ACCESS_TOKEN;
      if (!import.meta.env.DEV || !token) throw new Error("No session configured. Call configureSession().");
      return token;
    });
  }
}

let current: SessionProvider = new DevEnvSessionProvider();

export function configureSession(provider: SessionProvider): void {
  current = provider;
}

export function getSession(): SessionProvider {
  return current;
}
