import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentMonthRange } from "./date";

describe("getCurrentMonthRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("va dal primo giorno all'ultimo istante del mese corrente", () => {
    vi.setSystemTime(new Date("2026-10-08T12:00:00Z"));

    expect(getCurrentMonthRange()).toEqual({
      start: new Date("2026-10-01T00:00:00.000Z"),
      end: new Date("2026-10-31T23:59:59.999Z"),
    });
  });

  it("tiene conto degli anni bisestili", () => {
    vi.setSystemTime(new Date("2028-02-10T12:00:00Z"));

    expect(getCurrentMonthRange().end).toEqual(new Date("2028-02-29T23:59:59.999Z"));
  });
});
