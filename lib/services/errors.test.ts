import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { NotFoundError, notFoundIfMissing } from "./errors";

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("errore di prova", { code, clientVersion: "test" });
}

describe("notFoundIfMissing", () => {
  it("trasforma il record non trovato di Prisma (P2025) in NotFoundError con il messaggio dato", () => {
    const result = notFoundIfMissing(prismaError("P2025"), "Spesa non trovata");

    expect(result).toBeInstanceOf(NotFoundError);
    expect((result as NotFoundError).message).toBe("Spesa non trovata");
  });

  it("restituisce com'è ogni altro errore di Prisma", () => {
    const uniqueViolation = prismaError("P2002");

    expect(notFoundIfMissing(uniqueViolation, "Spesa non trovata")).toBe(uniqueViolation);
  });

  it("restituisce com'è un errore che non viene da Prisma", () => {
    const error = new Error("connessione persa");

    expect(notFoundIfMissing(error, "Spesa non trovata")).toBe(error);
  });
});
