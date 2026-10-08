import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/categories/route";
import { createCategory, createUser } from "../helpers/factories";
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
