import { Prisma } from "@prisma/client";

/**
 * Errori che i servizi lanciano quando una richiesta non si può soddisfare. Non conoscono
 * HTTP: è authedRoute in lib/api/route.ts a tradurli in status, così gli stessi servizi
 * si possono chiamare anche da un Server Component.
 */

/** La risorsa non esiste o è di un altro utente: chi chiama non deve poter distinguere i due casi. */
export class NotFoundError extends Error {}

/** Dati non validi, o una regola violata: nome già usato, categoria predefinita, password errata. */
export class InvalidRequestError extends Error {}

/**
 * Prisma segnala con P2025 un update o un delete che non trova il record. Con il filtro
 * su userId nella stessa query, è anche il caso della risorsa di un altro utente.
 * Ogni altro errore viene restituito com'è.
 */
export function notFoundIfMissing(error: unknown, message: string): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return new NotFoundError(message);
  }
  return error;
}
