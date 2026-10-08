import { describe, expect, it } from "vitest";
import { DELETE } from "@/app/api/categories/[id]/route";
import { GET, POST } from "@/app/api/categories/route";
import { prisma } from "@/lib/prisma";
import { createCategory, createExpense, createUser } from "../helpers/factories";
import { jsonRequest, routeContext } from "../helpers/request";
import { signInAs } from "../helpers/session";

describe("GET /api/categories", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("restituisce le categorie predefinite e quelle dell'utente, non quelle degli altri", async () => {
    const [me, other] = await Promise.all([createUser(), createUser()]);
    await createCategory({ name: "Spesa", isDefault: true });
    await createCategory({ name: "Palestra", userId: me.id });
    await createCategory({ name: "Golf", userId: other.id });
    signInAs(me);

    const response = await GET();
    const categories: { name: string }[] = await response.json();

    expect(response.status).toBe(200);
    expect(categories.map(({ name }) => name)).toEqual(["Spesa", "Palestra"]);
  });
});

describe("POST /api/categories", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await POST(jsonRequest("POST", "/api/categories", { name: "Palestra" }));

    expect(response.status).toBe(401);
  });

  it("richiede un nome", async () => {
    signInAs(await createUser());

    const response = await POST(jsonRequest("POST", "/api/categories", { name: "" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Nome richiesto" });
  });

  it("crea una categoria dell'utente con il colore predefinito", async () => {
    const me = await createUser();
    signInAs(me);

    const response = await POST(jsonRequest("POST", "/api/categories", { name: "Palestra", icon: "🏋️" }));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      name: "Palestra",
      icon: "🏋️",
      color: "#6366f1",
      isDefault: false,
      userId: me.id,
    });
  });

  it("rifiuta un nome già usato da una categoria predefinita o dell'utente", async () => {
    const me = await createUser();
    await createCategory({ name: "Spesa", isDefault: true });
    await createCategory({ name: "Palestra", userId: me.id });
    signInAs(me);

    for (const name of ["Spesa", "Palestra"]) {
      const response = await POST(jsonRequest("POST", "/api/categories", { name }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Categoria già esistente" });
    }
  });

  it("accetta un nome già usato da un altro utente", async () => {
    const [me, other] = await Promise.all([createUser(), createUser()]);
    await createCategory({ name: "Golf", userId: other.id });
    signInAs(me);

    const response = await POST(jsonRequest("POST", "/api/categories", { name: "Golf" }));

    expect(response.status).toBe(201);
  });
});

describe("DELETE /api/categories/[id]", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await DELETE(jsonRequest("DELETE", "/api/categories/x"), routeContext("x"));

    expect(response.status).toBe(401);
  });

  it("risponde 404 su una categoria che non esiste", async () => {
    signInAs(await createUser());

    const response = await DELETE(jsonRequest("DELETE", "/api/categories/x"), routeContext("x"));

    expect(response.status).toBe(404);
  });

  it("non cancella una categoria predefinita", async () => {
    signInAs(await createUser());
    const category = await createCategory({ name: "Spesa", isDefault: true });

    const response = await DELETE(jsonRequest("DELETE", `/api/categories/${category.id}`), routeContext(category.id));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Non puoi eliminare una categoria predefinita" });
    expect(await prisma.category.count({ where: { id: category.id } })).toBe(1);
  });

  // Le altre route rispondono 404 sulle risorse altrui; qui 403, che conferma che la categoria esiste
  it("risponde 403 su una categoria di un altro utente e non la cancella", async () => {
    const [me, other] = await Promise.all([createUser(), createUser()]);
    const theirs = await createCategory({ name: "Golf", userId: other.id });
    signInAs(me);

    const response = await DELETE(jsonRequest("DELETE", `/api/categories/${theirs.id}`), routeContext(theirs.id));

    expect(response.status).toBe(403);
    expect(await prisma.category.count({ where: { id: theirs.id } })).toBe(1);
  });

  it("non cancella una categoria che ha movimenti", async () => {
    const me = await createUser();
    const category = await createCategory({ name: "Palestra", userId: me.id });
    await createExpense({ userId: me.id, categoryId: category.id, amount: "40.00", date: "2026-10-01" });
    signInAs(me);

    const response = await DELETE(jsonRequest("DELETE", `/api/categories/${category.id}`), routeContext(category.id));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("Elimina prima le spese");
    expect(await prisma.category.count({ where: { id: category.id } })).toBe(1);
  });

  it("cancella una categoria dell'utente senza movimenti", async () => {
    const me = await createUser();
    const category = await createCategory({ name: "Palestra", userId: me.id });
    signInAs(me);

    const response = await DELETE(jsonRequest("DELETE", `/api/categories/${category.id}`), routeContext(category.id));

    expect(response.status).toBe(200);
    expect(await prisma.category.count({ where: { id: category.id } })).toBe(0);
  });
});
