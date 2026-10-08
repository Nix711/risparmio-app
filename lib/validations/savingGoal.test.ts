import { describe, expect, it } from "vitest";
import { addContributionSchema, createSavingGoalSchema, updateSavingGoalSchema } from "./savingGoal";

describe("createSavingGoalSchema", () => {
  const valid = { name: "Vacanza", target: 1500, due: "2027-07-01" };

  it("applica emoji e colore predefiniti", () => {
    expect(createSavingGoalSchema.parse(valid)).toMatchObject({ emoji: "🎯", accent: "#A78BFA" });
  });

  it("rifiuta un nome oltre i 50 caratteri", () => {
    const result = createSavingGoalSchema.safeParse({ ...valid, name: "x".repeat(51) });
    expect(result.error?.issues[0].message).toBe("Nome troppo lungo");
  });

  it.each(["red", "#FFF", "A78BFA"])("rifiuta il colore %j", (accent) => {
    expect(createSavingGoalSchema.safeParse({ ...valid, accent }).success).toBe(false);
  });

  it("richiede un obiettivo maggiore di zero", () => {
    const result = createSavingGoalSchema.safeParse({ ...valid, target: 0 });
    expect(result.error?.issues[0].message).toBe("L'obiettivo deve essere maggiore di 0");
  });

  it("richiede la scadenza", () => {
    const result = createSavingGoalSchema.safeParse({ ...valid, due: "" });
    expect(result.error?.issues[0].message).toBe("Scadenza richiesta");
  });
});

describe("updateSavingGoalSchema", () => {
  // A differenza di updateExpenseSchema, qui non ci sono default: un aggiornamento
  // parziale non sovrascrive i campi che non invia
  it("non aggiunge valori predefiniti ai campi non inviati", () => {
    expect(updateSavingGoalSchema.parse({ name: "Viaggio" })).toEqual({ name: "Viaggio" });
  });
});

describe("addContributionSchema", () => {
  it("accetta un versamento con nota facoltativa", () => {
    expect(addContributionSchema.safeParse({ amount: 50, date: "2026-10-08" }).success).toBe(true);
  });

  it("richiede un importo maggiore di zero", () => {
    const result = addContributionSchema.safeParse({ amount: 0, date: "2026-10-08" });
    expect(result.error?.issues[0].message).toBe("L'importo deve essere maggiore di 0");
  });

  it("richiede la data", () => {
    const result = addContributionSchema.safeParse({ amount: 50, date: "" });
    expect(result.error?.issues[0].message).toBe("Data richiesta");
  });
});
