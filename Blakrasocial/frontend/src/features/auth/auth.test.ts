import { describe, expect, it } from "vitest";
import { newPasswordProblem } from "./components/PasswordFields";
import { safeNext } from "./components/RequireAuth";

describe("safeNext", () => {
  it("keeps in-app paths", () => expect(safeNext("/posts?status=failed")).toBe("/posts?status=failed"));
  it.each([null, "", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)"])("rejects %s", (value) =>
    expect(safeNext(value)).toBe("/compose"),
  );
});

describe("newPasswordProblem", () => {
  const email = "sara@shop.example";
  it("accepts a good passphrase", () => expect(newPasswordProblem("Open-daily-24h!", "Open-daily-24h!", email)).toBeNull());
  it("requires the minimum length", () => expect(newPasswordProblem("short", "short", email)).toBe("auth.passwordLength"));
  it("rejects repeated characters", () => expect(newPasswordProblem("aaaaaaaaaaab", "aaaaaaaaaaab", email)).toBe("auth.passwordWeak"));
  it("rejects the email name", () => expect(newPasswordProblem("sara-2026-pass", "sara-2026-pass", email)).toBe("auth.passwordWeak"));
  it("requires matching confirmation", () => expect(newPasswordProblem("Open-daily-24h!", "Open-daily-24h", email)).toBe("auth.passwordMismatch"));
});
