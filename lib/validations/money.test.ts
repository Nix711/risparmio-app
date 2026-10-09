import { describe, expect, it } from "vitest";
import { nonNegativeAmount, positiveAmount } from "./money";

const errorOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0].message;

describe("positiveAmount", () => {
  const schema = positiveAmount();

  it.each([0.01, 19.99, 8.2, 9_999_999_999.99])("accetta %d", (value) => {
    expect(schema.safeParse(value).success).toBe(true);
  });

  it("rifiuta zero e i negativi", () => {
    expect(errorOf(schema.safeParse(0))).toBe("L'importo deve essere positivo");
    expect(errorOf(schema.safeParse(-5))).toBe("L'importo deve essere positivo");
  });

  // Il database arrotonderebbe 10.999 a 11.00 senza segnalare nulla
  it("rifiuta più di due decimali", () => {
    expect(errorOf(schema.safeParse(10.999))).toBe("L'importo non può avere più di due decimali");
  });

  it("rifiuta importi oltre la capienza di numeric(12,2)", () => {
    expect(errorOf(schema.safeParse(10_000_000_000))).toBe("L'importo supera il massimo consentito");
  });

  it("usa il messaggio personalizzato", () => {
    expect(errorOf(positiveAmount("Serve un importo").safeParse(0))).toBe("Serve un importo");
  });

  // BUG: multipleOf conta i decimali sulla stringa del numero, e 0.0000001 diventa "1e-7",
  // che di decimali non ne ha. Il database lo arrotonda a 0.00: un movimento da zero euro.
  it.fails("rifiuta un importo così piccolo da essere salvato come zero", () => {
    expect(schema.safeParse(0.0000001).success).toBe(false);
  });
});

describe("nonNegativeAmount", () => {
  const schema = nonNegativeAmount();

  it("accetta zero", () => {
    expect(schema.safeParse(0).success).toBe(true);
  });

  it("rifiuta i negativi", () => {
    expect(errorOf(schema.safeParse(-0.01))).toBe("L'importo non può essere negativo");
  });

  it("applica gli stessi vincoli di precisione e capienza", () => {
    expect(schema.safeParse(1.001).success).toBe(false);
    expect(schema.safeParse(10_000_000_000).success).toBe(false);
  });
});
