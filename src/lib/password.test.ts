import { describe, it, expect } from "vitest";
import { MIN_PASSWORD_LENGTH, validateNewPassword } from "./password";

describe("validateNewPassword", () => {
  // MIN_PASSWORD_LENGTH mirrors supabase/config.toml's minimum_password_length.
  // Rejecting client-side keeps the failure legible instead of surfacing a raw
  // GoTrue error after a round trip.
  it("accepts a password at the minimum length", () => {
    const pw = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(validateNewPassword(pw, pw)).toBeNull();
  });

  it("rejects one character under the minimum", () => {
    const pw = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    expect(validateNewPassword(pw, pw)).toMatch(/at least/i);
  });

  it("rejects a mismatched confirmation", () => {
    expect(validateNewPassword("correct-horse", "correct-hors")).toMatch(/match/i);
  });

  it("rejects an empty password without complaining about the match first", () => {
    expect(validateNewPassword("", "")).toMatch(/at least/i);
  });

  it("reports length before mismatch when both are wrong", () => {
    expect(validateNewPassword("abc", "xyz")).toMatch(/at least/i);
  });
});
