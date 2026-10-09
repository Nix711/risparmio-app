import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate } from "./format";

// Intl separa importo e simbolo con uno spazio non separabile, non con uno spazio normale
const NBSP = " ";

describe("formatCurrency", () => {
  it("formatta in euro all'italiana", () => {
    expect(formatCurrency(12345.67)).toBe(`12.345,67${NBSP}€`);
  });

  // Regola CLDR per l'italiano: il separatore delle migliaia compare da 5 cifre in su
  it("non separa le migliaia sotto le 5 cifre", () => {
    expect(formatCurrency(1234.56)).toBe(`1234,56${NBSP}€`);
  });

  it("mostra sempre due decimali e nasconde l'errore dei float", () => {
    expect(formatCurrency(0)).toBe(`0,00${NBSP}€`);
    expect(formatCurrency(0.1 + 0.2)).toBe(`0,30${NBSP}€`);
  });

  // Il progetto usa il segno meno − per gli importi negativi: chi chiama
  // deve passare il valore assoluto e aggiungere il segno da sé
  it("per i negativi usa il trattino ASCII, non il segno meno \\u2212", () => {
    expect(formatCurrency(-5)).toBe(`-5,00${NBSP}€`);
  });

  it("accetta un'altra valuta", () => {
    expect(formatCurrency(1, "USD")).toBe(`1,00${NBSP}USD`);
  });
});

describe("formatDate", () => {
  const date = new Date("2026-10-08T12:00:00Z");

  it("formato breve: giorno e mese abbreviato", () => {
    expect(formatDate(date)).toBe("8 ott");
  });

  it("formato lungo: giorno, mese e anno", () => {
    expect(formatDate(date, "long")).toBe("8 ottobre 2026");
  });

  it("accetta una stringa ISO", () => {
    expect(formatDate("2026-10-08")).toBe("8 ott");
  });
});
