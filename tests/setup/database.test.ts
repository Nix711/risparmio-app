import { describe, expect, it } from "vitest";
import { assertTestDatabase } from "./database";

describe("assertTestDatabase", () => {
  it.each([
    "postgresql://balancebook:balancebook@127.0.0.1:5432/balancebook_test",
    "postgresql://balancebook:balancebook@localhost:5432/balancebook_test",
  ])("accetta un database di test locale: %s", (url) => {
    expect(() => assertTestDatabase(url)).not.toThrow();
  });

  it.each([
    ["un database remoto", "postgresql://user:segreto@ep-example.eu-central-1.aws.neon.tech/neondb_test"],
    ["il database di sviluppo", "postgresql://balancebook:balancebook@127.0.0.1:5432/balancebook"],
  ])("rifiuta %s", (_, url) => {
    expect(() => assertTestDatabase(url)).toThrow("solo su un database locale che finisce in _test");
  });

  it("rifiuta una URL mancante", () => {
    expect(() => assertTestDatabase(undefined)).toThrow();
  });

  it("non mette la password nel messaggio d'errore", () => {
    expect(() => assertTestDatabase("postgresql://user:segreto@ep-example.neon.tech/neondb")).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("segreto") })
    );
  });
});
