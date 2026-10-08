import { describe, expect, it } from "vitest";
import { authorizeCredentials } from "@/lib/credentials";
import { createUser } from "../helpers/factories";

describe("authorizeCredentials", () => {
  it("con email e password giuste restituisce id, email e nome, mai l'hash della password", async () => {
    const user = await createUser({ password: "demo1234" });

    expect(await authorizeCredentials({ email: user.email, password: "demo1234" })).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  });

  it("rifiuta una password sbagliata", async () => {
    const user = await createUser({ password: "demo1234" });

    expect(await authorizeCredentials({ email: user.email, password: "sbagliata" })).toBeNull();
  });

  it("rifiuta un'email che non esiste", async () => {
    expect(await authorizeCredentials({ email: "nessuno@balancebook.test", password: "demo1234" })).toBeNull();
  });

  it.each([
    ["senza email", { password: "demo1234" }],
    ["con un'email non valida", { email: "demo", password: "demo1234" }],
    ["senza password", { email: "utente@balancebook.test", password: "" }],
    ["senza credenziali", undefined],
  ])("rifiuta una richiesta %s", async (_, credentials) => {
    expect(await authorizeCredentials(credentials)).toBeNull();
  });

  // BUG: come in registrazione, l'email è confrontata così com'è. "Utente1@…" non trova
  // "utente1@…" e il login fallisce con CredentialsSignin, come se la password fosse sbagliata.
  it.fails("accetta l'email scritta con le maiuscole", async () => {
    const user = await createUser({ password: "demo1234" });

    expect(await authorizeCredentials({ email: user.email.toUpperCase(), password: "demo1234" })).not.toBeNull();
  });
});
