/**
 * Il campo importo è di testo con `inputMode="decimal"`, non `type="number"`: sui telefoni apre
 * il tastierino con cifre e separatore, che in italiano è la virgola, e un campo numerico non
 * sempre accetta la virgola. Il controllo che `type="number"` faceva da sé lo fa questo pattern.
 *
 * Un importo maggiore di zero, con al più 10 cifre intere (il massimo di numeric(12,2)) e due
 * decimali, separati da virgola o punto. Il browser lo applica all'intero valore, come se fosse
 * racchiuso fra ^ e $.
 */
export const AMOUNT_PATTERN = String.raw`(?!0+(?:[.,]0+)?$)\d{1,10}(?:[.,]\d{1,2})?`;

export const AMOUNT_HINT = "Inserisci un importo maggiore di zero, con al massimo due decimali (es. 12,50)";

/** Converte il testo del campo importo in numero, con la virgola o il punto come separatore. */
export function parseAmountInput(value: string): number {
  return Number(value.trim().replace(",", "."));
}
