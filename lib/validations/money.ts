import { z } from "zod";

/** Massimo rappresentabile da numeric(12,2): 10 cifre intere più 2 decimali. */
const MAX_AMOUNT = 9_999_999_999.99;

const TOO_PRECISE = "L'importo non può avere più di due decimali";
const TOO_LARGE = "L'importo supera il massimo consentito";

/**
 * Senza questi vincoli il database accetterebbe 10.999 arrotondandolo a 11.00
 * senza segnalare nulla, e un importo oltre numeric(12,2) fallirebbe con un
 * errore Postgres invece che con un messaggio di validazione.
 */
export const positiveAmount = (message = "L'importo deve essere positivo") =>
  z.number().positive(message).multipleOf(0.01, TOO_PRECISE).max(MAX_AMOUNT, TOO_LARGE);

export const nonNegativeAmount = (message = "L'importo non può essere negativo") =>
  z.number().min(0, message).multipleOf(0.01, TOO_PRECISE).max(MAX_AMOUNT, TOO_LARGE);
