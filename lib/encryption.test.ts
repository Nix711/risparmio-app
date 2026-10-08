import { beforeEach, describe, expect, it, vi } from "vitest";
import { decrypt, encrypt } from "./encryption";

// Una seconda chiave valida, per simulare dati cifrati con un'altra chiave
const OTHER_KEY = Buffer.alloc(32, 7).toString("base64");

describe("encrypt", () => {
  it("produce iv:authTag:testo cifrato, con IV da 12 byte e tag da 16", () => {
    const parts = encrypt("Spesa al mercato").split(":");

    expect(parts).toHaveLength(3);
    expect(Buffer.from(parts[0], "base64")).toHaveLength(12);
    expect(Buffer.from(parts[1], "base64")).toHaveLength(16);
  });

  it("non lascia il testo in chiaro nel risultato", () => {
    expect(encrypt("Spesa al mercato")).not.toContain("Spesa");
  });

  // Con un IV fisso due descrizioni uguali avrebbero lo stesso cifrato,
  // e dal database si capirebbe quali movimenti si ripetono
  it("usa un IV casuale: lo stesso testo dà cifrati diversi", () => {
    expect(encrypt("Affitto")).not.toBe(encrypt("Affitto"));
  });

  it("si rifiuta di cifrare se manca la chiave, invece di salvare in chiaro", () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    expect(() => encrypt("Affitto")).toThrow("ENCRYPTION_KEY non configurata");
  });

  it("si rifiuta di cifrare con una chiave che non è di 32 byte", () => {
    vi.stubEnv("ENCRYPTION_KEY", Buffer.alloc(16).toString("base64"));
    expect(() => encrypt("Affitto")).toThrow();
  });
});

describe("decrypt", () => {
  beforeEach(() => {
    // decrypt registra gli errori in console: qui sono attesi, non rumore
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it.each(["Spesa al mercato", "Caffè ☕ e cornetto", "Cena: pizza: 20€", ""])(
    "restituisce il testo originale: %j",
    (text) => {
      expect(decrypt(encrypt(text))).toBe(text);
    }
  );

  it("restituisce invariato un testo mai cifrato (dati precedenti alla cifratura)", () => {
    expect(decrypt("Spesa al mercato")).toBe("Spesa al mercato");
    expect(console.error).not.toHaveBeenCalled();
  });

  it("restituisce invariato un testo in chiaro che ha due ':' per caso", () => {
    expect(decrypt("Cena: pizza: 20€")).toBe("Cena: pizza: 20€");
  });

  // GCM autentica il cifrato: una modifica viene scoperta, non decifrata in testo sbagliato
  it("non decifra un testo manomesso e lo restituisce com'è", () => {
    const [iv, tag, data] = encrypt("Stipendio").split(":");
    const bytes = Buffer.from(data, "base64");
    bytes[0] ^= 1;
    const tampered = `${iv}:${tag}:${bytes.toString("base64")}`;

    expect(decrypt(tampered)).toBe(tampered);
    expect(console.error).toHaveBeenCalled();
  });

  it("non decifra con una chiave diversa da quella usata per cifrare", () => {
    const encrypted = encrypt("Stipendio");
    vi.stubEnv("ENCRYPTION_KEY", OTHER_KEY);

    expect(decrypt(encrypted)).toBe(encrypted);
    expect(console.error).toHaveBeenCalled();
  });

  it("restituisce il testo invariato se manca la chiave, senza lanciare", () => {
    const encrypted = encrypt("Stipendio");
    vi.stubEnv("ENCRYPTION_KEY", "");

    expect(decrypt(encrypted)).toBe(encrypted);
    expect(console.error).toHaveBeenCalled();
  });
});
