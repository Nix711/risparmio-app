import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "./profile";

describe("updateProfileSchema", () => {
  it("accetta una richiesta vuota: ogni campo è facoltativo", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it.each([
    ["un nome di un carattere", { name: "A" }, "Nome deve avere almeno 2 caratteri"],
    ["un'email non valida", { email: "demo" }, "Email non valida"],
    ["una nuova password troppo corta", { newPassword: "12345" }, "Password deve avere almeno 6 caratteri"],
  ])("rifiuta %s con il messaggio per l'utente", (_, data, message) => {
    expect(updateProfileSchema.safeParse(data).error?.issues[0].message).toBe(message);
  });
});
