import { describe, expect, it } from "vitest";
import { isNewAccount, parseAuthLink } from "./googleSignIn";

describe("parseAuthLink", () => {
  it("reads the code from our own callback link", () => {
    expect(
      parseAuthLink("com.mybodyweight.app://auth-callback?code=abc-123"),
    ).toEqual({ code: "abc-123" });
  });

  it("returns an empty code when the user refused", () => {
    expect(
      parseAuthLink("com.mybodyweight.app://auth-callback?error=access_denied"),
    ).toEqual({ code: "" });
  });

  it("ignores every other link", () => {
    for (const link of [
      "com.mybodyweight.app://auth-callback-evil?code=x",
      "com.mybodyweight.app://other?code=x",
      "https://example.com/?code=x",
      "",
    ]) {
      expect(parseAuthLink(link)).toBeNull();
    }
  });
});

describe("isNewAccount", () => {
  const created_at = "2026-11-25T10:00:00Z";

  it("is new when the first sign-in follows account creation", () => {
    expect(
      isNewAccount({ created_at, last_sign_in_at: "2026-11-25T10:00:05Z" }),
    ).toBe(true);
  });

  it("is not new for an account made earlier", () => {
    expect(
      isNewAccount({ created_at, last_sign_in_at: "2026-11-26T10:00:00Z" }),
    ).toBe(false);
  });
});
