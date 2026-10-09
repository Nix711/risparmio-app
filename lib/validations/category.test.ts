import { describe, expect, it } from "vitest";
import { createCategorySchema } from "./category";

describe("createCategorySchema", () => {
  it("accetta una categoria con il solo nome", () => {
    expect(createCategorySchema.safeParse({ name: "Palestra" }).success).toBe(true);
  });

  it("accetta icona e colore", () => {
    expect(createCategorySchema.safeParse({ name: "Palestra", icon: "🏋️", color: "#22c55e" }).success).toBe(true);
  });

  it("rifiuta un nome vuoto con il messaggio per l'utente", () => {
    const result = createCategorySchema.safeParse({ name: "" });

    expect(result.error?.issues[0].message).toBe("Nome richiesto");
  });
});
