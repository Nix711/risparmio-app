import { Prisma } from "@prisma/client";

/**
 * Gli importi sono `Decimal` nel database e in ogni calcolo; diventano `number`
 * solo al confine con la UI. Prisma serializza i Decimal in JSON come stringhe
 * ("42.50"), quindi senza questa conversione i client riceverebbero stringhe
 * dove si aspettano numeri e le somme diventerebbero concatenazioni.
 */

type Serialized<T> = T extends Prisma.Decimal
  ? number
  : T extends Date
    ? Date
    : T extends Array<infer U>
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;

/** Converte in `number` ogni Decimal annidato. Da usare solo su ciò che esce in JSON. */
export function serializeMoney<T>(value: T): Serialized<T> {
  if (Prisma.Decimal.isDecimal(value)) {
    return value.toNumber() as Serialized<T>;
  }
  if (value === null || typeof value !== "object" || value instanceof Date) {
    return value as Serialized<T>;
  }
  if (Array.isArray(value)) {
    return value.map(serializeMoney) as Serialized<T>;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [key, serializeMoney(inner)])
  ) as Serialized<T>;
}

/** Somma esatta: `reduce` con `+` su Decimal produrrebbe una concatenazione. */
export function sumMoney(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce((total, value) => total.plus(value), new Prisma.Decimal(0));
}

/** Variazione percentuale fra due importi. Restituisce 0 se il precedente è zero. */
export function changePercent(current: Prisma.Decimal, previous: Prisma.Decimal): number {
  if (previous.lessThanOrEqualTo(0)) return 0;
  return current.minus(previous).dividedBy(previous).times(100).toNumber();
}
