import { describe, expect, it } from "vitest";
import { AMOUNT_PATTERN, parseAmountInput } from "./amount";

// Come lo compila il browser per l'attributo pattern: ancorato e con il flag v
const pattern = new RegExp(`^(?:${AMOUNT_PATTERN})$`, "v");

describe("AMOUNT_PATTERN", () => {
  it.each(["12", "12,5", "12,50", "12.50", "0,01", "0.5", "9999999999,99"])("accetta %s", (value) => {
    expect(pattern.test(value)).toBe(true);
  });

  it.each(["0", "0,00", "000.0"])("rifiuta lo zero: %s", (value) => {
    expect(pattern.test(value)).toBe(false);
  });

  // "1.234" si potrebbe leggere come milleduecentotrentaquattro: meglio rifiutarlo che salvare 1,23
  it.each(["12,345", "1.234", "1.234,56"])("rifiuta più di due decimali o i separatori delle migliaia: %s", (value) => {
    expect(pattern.test(value)).toBe(false);
  });

  it.each(["", "abc", "12a", "-5", "12,", ",50", "12 50", "10000000000"])("rifiuta %j", (value) => {
    expect(pattern.test(value)).toBe(false);
  });
});

describe("parseAmountInput", () => {
  it("accetta la virgola come separatore dei decimali", () => {
    expect(parseAmountInput("12,50")).toBe(12.5);
  });

  it("accetta anche il punto", () => {
    expect(parseAmountInput("12.50")).toBe(12.5);
  });

  it("ignora gli spazi ai lati", () => {
    expect(parseAmountInput(" 7,2 ")).toBe(7.2);
  });
});
