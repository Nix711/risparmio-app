import { compare } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { GET, PUT } from "@/app/api/profile/route";
import { prisma } from "@/lib/prisma";
import { createUser } from "../helpers/factories";
import { jsonRequest } from "../helpers/request";
import { signInAs } from "../helpers/session";

function updateProfile(body: unknown) {
  return PUT(jsonRequest("PUT", "/api/profile", body));
}

async function storedPassword(userId: string) {
  return (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).password;
}

describe("GET /api/profile", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("restituisce il profilo dell'utente senza la password", async () => {
    const me = await createUser();
    signInAs(me);

    const response = await GET();
    const profile = await response.json();

    expect(response.status).toBe(200);
    expect(profile).toMatchObject({ id: me.id, email: me.email, currency: "EUR" });
    expect(profile).not.toHaveProperty("password");
  });
});

describe("PUT /api/profile", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await updateProfile({ name: "Nuovo nome" });

    expect(response.status).toBe(401);
  });

  it("aggiorna nome e valuta", async () => {
    signInAs(await createUser());

    const response = await updateProfile({ name: "Nuovo nome", currency: "USD" });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: "Nuovo nome", currency: "USD" });
  });

  it("rifiuta un'email già usata da un altro utente", async () => {
    const [me, other] = await Promise.all([createUser(), createUser()]);
    signInAs(me);

    const response = await updateProfile({ email: other.email });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Email già in uso" });
  });

  it("per cambiare password richiede quella attuale", async () => {
    signInAs(await createUser({ password: "vecchia123" }));

    const response = await updateProfile({ newPassword: "nuova123" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Password attuale richiesta" });
  });

  it("non cambia la password se quella attuale è sbagliata", async () => {
    const me = await createUser({ password: "vecchia123" });
    signInAs(me);

    const response = await updateProfile({ currentPassword: "sbagliata", newPassword: "nuova123" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Password attuale non corretta" });
    expect(await compare("vecchia123", await storedPassword(me.id))).toBe(true);
  });

  it("cambia la password se quella attuale è corretta", async () => {
    const me = await createUser({ password: "vecchia123" });
    signInAs(me);

    const response = await updateProfile({ currentPassword: "vecchia123", newPassword: "nuova123" });
    const password = await storedPassword(me.id);

    expect(response.status).toBe(200);
    expect(await response.json()).not.toHaveProperty("password");
    expect(await compare("nuova123", password)).toBe(true);
    expect(await compare("vecchia123", password)).toBe(false);
  });
});
