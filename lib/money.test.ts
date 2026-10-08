import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { changePercent, serializeMoney, sumMoney } from "./money";

const d = (value: string | number) => new Prisma.Decimal(value);

describe("serializeMoney", () => {
  it("converte un Decimal in number", () => {
    expect(serializeMoney(d("42.50"))).toBe(42.5);
  });

  it("converte i Decimal annidati e lascia invariato il resto", () => {
    const expense = {
      id: "e1",
      amount: d("19.99"),
      category: { name: "Spesa", budget: d("300.00") },
    };

    expect(serializeMoney(expense)).toEqual({
      id: "e1",
      amount: 19.99,
      category: { name: "Spesa", budget: 300 },
    });
  });

  it("converte gli elementi di un array", () => {
    expect(serializeMoney([{ amount: d("1.10") }, { amount: d("2.20") }])).toEqual([
      { amount: 1.1 },
      { amount: 2.2 },
    ]);
  });

  it("non trasforma le Date in oggetti vuoti", () => {
    const date = new Date("2026-10-08T12:00:00Z");
    const result = serializeMoney({ date });

    expect(result.date).toBeInstanceOf(Date);
    expect(result.date).toEqual(date);
  });

  it("lascia passare null e i valori primitivi", () => {
    expect(serializeMoney(null)).toBeNull();
    expect(serializeMoney("testo")).toBe("testo");
    expect(serializeMoney(3)).toBe(3);
  });

  // Il motivo per cui esiste: senza conversione il JSON conterrebbe stringhe
  it("produce numeri nel JSON, non stringhe", () => {
    expect(JSON.stringify({ amount: d("42.50") })).toBe('{"amount":"42.5"}');
    expect(JSON.stringify(serializeMoney({ amount: d("42.50") }))).toBe('{"amount":42.5}');
  });
});

describe("sumMoney", () => {
  it("restituisce zero per un elenco vuoto", () => {
    expect(sumMoney([]).toFixed(2)).toBe("0.00");
  });

  it("somma senza l'errore dei float", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney([d("0.1"), d("0.2")]).toFixed(2)).toBe("0.30");
  });

  it("resta esatta su molte righe", () => {
    const amounts = Array.from({ length: 1000 }, () => d("0.10"));
    expect(sumMoney(amounts).toFixed(2)).toBe("100.00");
  });
});

describe("changePercent", () => {
  it("calcola un aumento", () => {
    expect(changePercent(d(150), d(100))).toBe(50);
  });

  it("calcola una diminuzione", () => {
    expect(changePercent(d(50), d(100))).toBe(-50);
  });

  it("restituisce 0 se il periodo precedente è zero, invece di dividere per zero", () => {
    expect(changePercent(d(100), d(0))).toBe(0);
  });

  it("restituisce 0 se il periodo precedente è negativo", () => {
    expect(changePercent(d(100), d(-50))).toBe(0);
  });
});
