import { describe, expect, it } from "vitest";
import { createGoalSchema, updateGoalSchema } from "./goal";

const valid = { name: "Spesa", targetAmount: 300, type: "limit", month: 10, year: 2026 };

describe("createGoalSchema", () => {
  it("accetta un obiettivo valido", () => {
    expect(createGoalSchema.safeParse(valid).success).toBe(true);
  });

  it.each([0, 13])("rifiuta il mese %d", (month) => {
    expect(createGoalSchema.safeParse({ ...valid, month }).success).toBe(false);
  });

  it("rifiuta un tipo diverso da saving o limit", () => {
    expect(createGoalSchema.safeParse({ ...valid, type: "other" }).success).toBe(false);
  });

  it("richiede un importo obiettivo positivo", () => {
    expect(createGoalSchema.safeParse({ ...valid, targetAmount: 0 }).success).toBe(false);
  });
});

describe("updateGoalSchema", () => {
  it("accetta un importo raggiunto pari a zero", () => {
    expect(updateGoalSchema.safeParse({ currentAmount: 0 }).success).toBe(true);
  });

  it("rifiuta un importo raggiunto negativo", () => {
    expect(updateGoalSchema.safeParse({ currentAmount: -1 }).success).toBe(false);
  });
});
