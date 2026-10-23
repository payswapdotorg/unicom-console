// Canonical test example (BASE) — proves the bun-test setup and the frozen
// display helpers. Lanes: keep this file green; add your own tests alongside.
// Every test file needs the bun-types reference below (no global tsconfig types).
/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { dayTime, expiresLabel, hhmm, relativeTime } from "@/server/display";

const NOW = new Date("2026-10-23T12:00:00Z");

describe("display helpers (frozen base)", () => {
  test("hhmm formats UTC time-of-day", () => {
    expect(hhmm("2026-10-23T07:04:33Z")).toBe("07:04Z");
  });

  test("relativeTime buckets", () => {
    expect(relativeTime(new Date(NOW.getTime() - 30_000), NOW)).toBe("just now");
    expect(relativeTime(new Date(NOW.getTime() - 5 * 60_000), NOW)).toBe("5 min ago");
    expect(relativeTime(new Date(NOW.getTime() - 3 * 3_600_000), NOW)).toBe("3 h ago");
    expect(relativeTime(new Date(NOW.getTime() - 30 * 3_600_000), NOW)).toBe(
      "yesterday 06:00Z",
    );
    expect(relativeTime(null, NOW)).toBe("never");
  });

  test("dayTime distinguishes today / yesterday / older", () => {
    expect(dayTime(new Date("2026-10-23T06:02:00Z"), NOW)).toBe("06:02Z");
    expect(dayTime(new Date("2026-10-22T22:47:00Z"), NOW)).toBe("yesterday 22:47Z");
    expect(dayTime(new Date("2026-10-01T09:00:00Z"), NOW)).toBe("2026-10-01");
  });

  test("expiresLabel prefixes dayTime", () => {
    expect(expiresLabel(new Date("2026-10-23T18:00:00Z"), NOW)).toBe(
      "expires 18:00Z",
    );
  });
});
