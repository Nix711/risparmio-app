import { describe, expect, it } from "vitest";
import { DELETE, PUT } from "@/app/api/expenses/[id]/route";
import { GET, POST } from "@/app/api/expenses/route";
import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { createCategory, createExpense, createUser } from "../helpers/factories";
import { storedDescription } from "../helpers/raw";
import { jsonRequest, routeContext } from "../helpers/request";
import { signInAs } from "../helpers/session";

type ExpenseResponse = {
  id: string;
  amount: number;
  description: string | null;
  type: string;
  category: { name: string };
};

/** Due utenti con una categoria ciascuno; la sessione è del primo. */
async function seedTwoUsers() {
  const [me, other] = await Promise.all([createUser(), createUser()]);
  const [myCategory, otherCategory] = await Promise.all([
    createCategory({ name: "Spesa", userId: me.id }),
    createCategory({ name: "Spesa", userId: other.id }),
  ]);
  signInAs(me);
  return { me, other, myCategory, otherCategory };
}

describe("GET /api/expenses", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await GET(jsonRequest("GET", "/api/expenses"));

    expect(response.status).toBe(401);
  });

  it("restituisce solo i movimenti dell'utente, dal più recente, con importi numerici e descrizioni in chiaro", async () => {
    const { me, other, myCategory, otherCategory } = await seedTwoUsers();
    await createExpense({ userId: me.id, categoryId: myCategory.id, amount: "12.50", date: "2026-10-01", description: "Mercato" });
    await createExpense({ userId: me.id, categoryId: myCategory.id, amount: "40.00", date: "2026-10-05", description: "Benzina" });
    await createExpense({ userId: other.id, categoryId: otherCategory.id, amount: "99.00", date: "2026-10-03", description: "Non mia" });

    const response = await GET(jsonRequest("GET", "/api/expenses"));
    const expenses: ExpenseResponse[] = await response.json();

    expect(response.status).toBe(200);
    expect(expenses.map(({ description, amount }) => ({ description, amount }))).toEqual([
      { description: "Benzina", amount: 40 },
      { description: "Mercato", amount: 12.5 },
    ]);
    expect(expenses[0].category.name).toBe("Spesa");
  });

  it("filtra per mese, compresi il primo e l'ultimo giorno", async () => {
    const { me, myCategory } = await seedTwoUsers();
    for (const date of ["2026-09-30", "2026-10-01", "2026-10-31", "2026-11-01"]) {
      await createExpense({ userId: me.id, categoryId: myCategory.id, amount: "1.00", date, description: date });
    }

    const response = await GET(jsonRequest("GET", "/api/expenses?month=10&year=2026"));
    const expenses: ExpenseResponse[] = await response.json();

    expect(expenses.map(({ description }) => description)).toEqual(["2026-10-31", "2026-10-01"]);
  });

  it("filtra per tipo e per categoria", async () => {
    const { me, myCategory } = await seedTwoUsers();
    const salary = await createCategory({ name: "Stipendio", userId: me.id });
    await createExpense({ userId: me.id, categoryId: myCategory.id, amount: "30.00", date: "2026-10-02", description: "Spesa" });
    await createExpense({ userId: me.id, categoryId: salary.id, amount: "1500.00", date: "2026-10-01", type: "income", description: "Stipendio" });

    const byType = await GET(jsonRequest("GET", "/api/expenses?type=income"));
    const byCategory = await GET(jsonRequest("GET", `/api/expenses?categoryId=${myCategory.id}`));

    expect((await byType.json()).map((e: ExpenseResponse) => e.description)).toEqual(["Stipendio"]);
    expect((await byCategory.json()).map((e: ExpenseResponse) => e.description)).toEqual(["Spesa"]);
  });
});

describe("POST /api/expenses", () => {
  const body = (categoryId: string) => ({
    amount: 19.99,
    description: "Spesa al mercato",
    categoryId,
    date: "2026-10-08",
  });

  it("risponde 401 senza sessione", async () => {
    const response = await POST(jsonRequest("POST", "/api/expenses", body("qualunque")));

    expect(response.status).toBe(401);
  });

  it("risponde 400 con il messaggio di validazione", async () => {
    const { myCategory } = await seedTwoUsers();

    const response = await POST(jsonRequest("POST", "/api/expenses", { ...body(myCategory.id), amount: -5 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "L'importo deve essere positivo" });
  });

  it("crea il movimento per l'utente della sessione e risponde 201", async () => {
    const { me, myCategory } = await seedTwoUsers();

    const response = await POST(jsonRequest("POST", "/api/expenses", body(myCategory.id)));
    const expense: ExpenseResponse = await response.json();
    const saved = await prisma.expense.findUnique({ where: { id: expense.id } });

    expect(response.status).toBe(201);
    expect(expense).toMatchObject({
      amount: 19.99,
      description: "Spesa al mercato",
      type: "expense",
      category: { name: "Spesa" },
    });
    expect(saved?.userId).toBe(me.id);
    expect(saved?.amount.toFixed(2)).toBe("19.99");
  });

  it("salva la descrizione cifrata nel database", async () => {
    const { myCategory } = await seedTwoUsers();

    const response = await POST(jsonRequest("POST", "/api/expenses", body(myCategory.id)));
    const { id }: ExpenseResponse = await response.json();
    const stored = await storedDescription(id);

    expect(stored).not.toContain("mercato");
    expect(decrypt(stored)).toBe("Spesa al mercato");
  });
});

describe("PUT /api/expenses/[id]", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await PUT(jsonRequest("PUT", "/api/expenses/x", { amount: 1 }), routeContext("x"));

    expect(response.status).toBe(401);
  });

  it("risponde 404 su un movimento di un altro utente e non lo modifica", async () => {
    const { other, otherCategory } = await seedTwoUsers();
    const theirs = await createExpense({ userId: other.id, categoryId: otherCategory.id, amount: "50.00", date: "2026-10-01" });

    const response = await PUT(jsonRequest("PUT", `/api/expenses/${theirs.id}`, { amount: 1 }), routeContext(theirs.id));
    const unchanged = await prisma.expense.findUnique({ where: { id: theirs.id } });

    expect(response.status).toBe(404);
    expect(unchanged?.amount.toFixed(2)).toBe("50.00");
  });

  it("risponde 404 su un movimento che non esiste", async () => {
    await seedTwoUsers();

    const response = await PUT(jsonRequest("PUT", "/api/expenses/inesistente", { amount: 1 }), routeContext("inesistente"));

    expect(response.status).toBe(404);
  });

  it("risponde 400 con dati non validi", async () => {
    const { me, myCategory } = await seedTwoUsers();
    const mine = await createExpense({ userId: me.id, categoryId: myCategory.id, amount: "10.00", date: "2026-10-01" });

    const response = await PUT(jsonRequest("PUT", `/api/expenses/${mine.id}`, { amount: 10.999 }), routeContext(mine.id));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "L'importo non può avere più di due decimali" });
  });

  it("aggiorna solo i campi inviati e cifra la nuova descrizione", async () => {
    const { me, myCategory } = await seedTwoUsers();
    const mine = await createExpense({ userId: me.id, categoryId: myCategory.id, amount: "10.00", date: "2026-10-01", description: "Prima" });

    const response = await PUT(jsonRequest("PUT", `/api/expenses/${mine.id}`, { description: "Dopo" }), routeContext(mine.id));
    const updated: ExpenseResponse = await response.json();
    const stored = await storedDescription(mine.id);

    expect(response.status).toBe(200);
    expect(updated).toMatchObject({ description: "Dopo", amount: 10 });
    expect(stored).not.toContain("Dopo");
    expect(decrypt(stored)).toBe("Dopo");
  });
});

describe("DELETE /api/expenses/[id]", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await DELETE(jsonRequest("DELETE", "/api/expenses/x"), routeContext("x"));

    expect(response.status).toBe(401);
  });

  it("risponde 404 su un movimento di un altro utente e non lo cancella", async () => {
    const { other, otherCategory } = await seedTwoUsers();
    const theirs = await createExpense({ userId: other.id, categoryId: otherCategory.id, amount: "50.00", date: "2026-10-01" });

    const response = await DELETE(jsonRequest("DELETE", `/api/expenses/${theirs.id}`), routeContext(theirs.id));

    expect(response.status).toBe(404);
    expect(await prisma.expense.count({ where: { id: theirs.id } })).toBe(1);
  });

  it("cancella il movimento dell'utente", async () => {
    const { me, myCategory } = await seedTwoUsers();
    const mine = await createExpense({ userId: me.id, categoryId: myCategory.id, amount: "10.00", date: "2026-10-01" });

    const response = await DELETE(jsonRequest("DELETE", `/api/expenses/${mine.id}`), routeContext(mine.id));

    expect(response.status).toBe(200);
    expect(await prisma.expense.count({ where: { id: mine.id } })).toBe(0);
  });
});

describe("categoria di un movimento", () => {
  it("accetta una categoria predefinita", async () => {
    await seedTwoUsers();
    const shared = await createCategory({ name: "Casa", isDefault: true });

    const response = await POST(jsonRequest("POST", "/api/expenses", { amount: 10, categoryId: shared.id, date: "2026-10-08" }));

    expect(response.status).toBe(201);
  });

  // BUG: categoryId non viene confrontato con l'utente della sessione. Il movimento prende
  // la categoria di un altro utente, ne mostra il nome e gli impedisce di cancellarla.
  it.fails("POST non accetta la categoria di un altro utente", async () => {
    const { otherCategory } = await seedTwoUsers();

    const response = await POST(jsonRequest("POST", "/api/expenses", { amount: 10, categoryId: otherCategory.id, date: "2026-10-08" }));

    expect(response.ok).toBe(false);
    expect(await prisma.expense.count()).toBe(0);
  });

  it.fails("PUT non sposta un movimento nella categoria di un altro utente", async () => {
    const { me, myCategory, otherCategory } = await seedTwoUsers();
    const mine = await createExpense({ userId: me.id, categoryId: myCategory.id, amount: "10.00", date: "2026-10-01" });

    const response = await PUT(jsonRequest("PUT", `/api/expenses/${mine.id}`, { categoryId: otherCategory.id }), routeContext(mine.id));
    const unchanged = await prisma.expense.findUnique({ where: { id: mine.id } });

    expect(response.ok).toBe(false);
    expect(unchanged?.categoryId).toBe(myCategory.id);
  });
});
