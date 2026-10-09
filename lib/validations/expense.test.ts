import { describe, expect, it } from "vitest";
import { createExpenseSchema, updateExpenseSchema } from "./expense";

const valid = { amount: 19.99, categoryId: "cat-1", date: "2026-10-08" };

describe("createExpenseSchema", () => {
  it("accetta un movimento minimo e lo considera una spesa", () => {
    const result = createExpenseSchema.parse(valid);
    expect(result.type).toBe("expense");
  });

  it("accetta un'entrata", () => {
    expect(createExpenseSchema.parse({ ...valid, type: "income" }).type).toBe("income");
  });

  it("rifiuta un tipo diverso da spesa o entrata", () => {
    expect(createExpenseSchema.safeParse({ ...valid, type: "transfer" }).success).toBe(false);
  });

  it("richiede una categoria", () => {
    const result = createExpenseSchema.safeParse({ ...valid, categoryId: "" });
    expect(result.error?.issues[0].message).toBe("Seleziona una categoria");
  });

  it("applica i vincoli sugli importi", () => {
    expect(createExpenseSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(createExpenseSchema.safeParse({ ...valid, amount: 10.999 }).success).toBe(false);
  });

  it("accetta la data come stringa o come Date", () => {
    expect(createExpenseSchema.safeParse(valid).success).toBe(true);
    expect(createExpenseSchema.safeParse({ ...valid, date: new Date() }).success).toBe(true);
  });

  // BUG: qualunque stringa passa; new Date("ciao") dà Invalid Date e la route risponde 500 invece di 400
  it.fails("rifiuta una data che non è una data", () => {
    expect(createExpenseSchema.safeParse({ ...valid, date: "ciao" }).success).toBe(false);
  });
});

describe("updateExpenseSchema", () => {
  it("accetta un aggiornamento vuoto", () => {
    expect(updateExpenseSchema.safeParse({}).success).toBe(true);
  });

  it("valida i campi presenti", () => {
    expect(updateExpenseSchema.safeParse({ amount: -1 }).success).toBe(false);
  });

  // BUG: .partial() mantiene il default di type, quindi un PUT con il solo importo
  // trasforma un'entrata in una spesa. La UI oggi manda sempre type e non se ne accorge.
  it.fails("non cambia il tipo se il tipo non viene inviato", () => {
    expect(updateExpenseSchema.parse({ amount: 10 })).not.toHaveProperty("type");
  });
});
