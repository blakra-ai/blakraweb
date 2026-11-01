/** Built-in sign-in: the short access token lives only in memory; the refresh token is an HttpOnly
 *  cookie the browser sends to /auth/refresh. Several tabs/requests share one refresh in flight. */
import { ApiError } from "@/shared/api/ApiError";
import type { SessionResponse, User } from "@/shared/api/types";
import { profileKeyFromToken, type SessionProvider } from "./session";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const CSRF = { "X-Requested-With": "blakrasocial" };
const EARLY_REFRESH_MS = 60_000;

type Listener = (user: User | null) => void;

export class BuiltinSession implements SessionProvider {
  private token: string | null = null;
  private expiresAt = 0;
  private inflight: Promise<string> | null = null;
  private user: User | null = null;
  private readonly listeners = new Set<Listener>();

  get currentUser(): User | null {
    return this.user;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - EARLY_REFRESH_MS) return this.token;
    this.inflight ??= this.refresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  getProfileKey(token: string): string {
    return profileKeyFromToken(token, "profile_key");
  }

  onUnauthorized(): void {
    this.apply(null);
  }

  /** Tries the cookie once at startup; resolves to the user or null (signed out). */
  async restore(): Promise<User | null> {
    try {
      await this.getAccessToken();
      return this.user;
    } catch {
      return null;
    }
  }

  signIn(email: string, password: string): Promise<User> {
    return this.post("/auth/login", { email, password });
  }

  acceptInvite(token: string, password: string): Promise<User> {
    return this.post(`/auth/invites/${encodeURIComponent(token)}`, { password });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<User> {
    const access = await this.getAccessToken();
    return this.post("/auth/password", { currentPassword, newPassword }, access);
  }

  async signOut(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/auth/logout`, { method: "POST", credentials: "include", headers: CSRF });
    } finally {
      this.apply(null);
    }
  }

  private async refresh(): Promise<string> {
    await this.post("/auth/refresh", undefined);
    return this.token!;
  }

  private async post(path: string, body: unknown, access?: string): Promise<User> {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        credentials: "include",
        referrerPolicy: "no-referrer",
        headers: {
          ...CSRF,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw ApiError.network();
    }
    const payload = (await response.json().catch(() => ({}))) as Partial<SessionResponse> & {
      type?: string;
      title?: string;
      detail?: string;
      errors?: ApiError["issues"];
    };
    if (!response.ok) {
      if (response.status === 401) this.apply(null);
      throw new ApiError({
        status: response.status,
        type: payload.type ?? "about:blank",
        title: payload.title ?? response.statusText,
        detail: payload.detail,
        issues: payload.errors,
      });
    }
    const session = payload as SessionResponse;
    this.token = session.accessToken;
    this.expiresAt = Date.now() + session.expiresIn * 1000;
    this.apply(session.user);
    return session.user;
  }

  private apply(user: User | null): void {
    if (!user) {
      this.token = null;
      this.expiresAt = 0;
    }
    const changed = user?.id !== this.user?.id || user?.role !== this.user?.role;
    this.user = user;
    if (changed) this.listeners.forEach((l) => l(user));
  }
}

export const builtinSession = new BuiltinSession();
