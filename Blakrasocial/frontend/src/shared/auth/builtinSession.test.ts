import { afterEach, describe, expect, it, vi } from "vitest";
import { BuiltinSession } from "./builtinSession";

const user = { id: "u1", email: "a@b.example", title: "A", role: "customer", profileKey: "pk" } as const;
const session = { accessToken: "h.eyJwcm9maWxlX2tleSI6InBrIn0.s", expiresIn: 900, user };

function respond(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

afterEach(() => vi.unstubAllGlobals());

describe("BuiltinSession", () => {
  it("shares one refresh between concurrent callers and reuses the token", async () => {
    const fetchMock = vi.fn(() => respond(200, session));
    vi.stubGlobal("fetch", fetchMock);
    const s = new BuiltinSession();
    const [a, b] = await Promise.all([s.getAccessToken(), s.getAccessToken()]);
    expect(a).toBe(session.accessToken);
    expect(b).toBe(a);
    await s.getAccessToken();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(s.getProfileKey(a)).toBe("pk");
  });

  it("sends the CSRF header and the cookie", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() => respond(200, session));
    vi.stubGlobal("fetch", fetchMock);
    await new BuiltinSession().signIn("a@b.example", "x");
    const init = fetchMock.mock.calls[0]![1];
    expect(init.credentials).toBe("include");
    expect((init.headers as Record<string, string>)["X-Requested-With"]).toBe("blakrasocial");
  });

  it("restore() resolves to null without a session and notifies on sign-out", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respond(200, session)));
    const s = new BuiltinSession();
    const seen: unknown[] = [];
    s.subscribe((u) => seen.push(u?.id ?? null));
    await s.signIn("a@b.example", "x");
    s.onUnauthorized();
    expect(seen).toEqual(["u1", null]);
    vi.stubGlobal("fetch", vi.fn(() => respond(401, { title: "Please sign in." })));
    expect(await s.restore()).toBeNull();
  });
});
