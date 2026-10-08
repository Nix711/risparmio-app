import { describe, expect, it } from "vitest";
import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { createCategory, createUser } from "../helpers/factories";
import { storedDescription } from "../helpers/raw";

const PLAIN = "Spesa al mercato";

/** I dati di un movimento, con utente e categoria appena creati. */
async function expenseData() {
  const user = await createUser();
  const category = await createCategory({ name: "Spesa", userId: user.id });
  return { userId: user.id, categoryId: category.id, amount: "10.00", date: new Date("2026-10-08"), description: PLAIN };
}

type ExpenseData = Awaited<ReturnType<typeof expenseData>>;

/** L'id dell'unico movimento nel database, per le operazioni che non lo restituiscono. */
async function onlyExpenseId() {
  const [row] = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Expense"`;
  return row.id;
}

async function expectStoredEncrypted(id: string) {
  const stored = await storedDescription(id);
  expect(stored).not.toBe(PLAIN);
  expect(decrypt(stored)).toBe(PLAIN);
}

describe("estensione di cifratura: operazioni coperte", () => {
  it("create salva la descrizione cifrata e la restituisce in chiaro", async () => {
    const expense = await prisma.expense.create({ data: await expenseData() });

    expect(expense.description).toBe(PLAIN);
    await expectStoredEncrypted(expense.id);
  });

  it("update cifra la nuova descrizione", async () => {
    const { id } = await prisma.expense.create({ data: { ...(await expenseData()), description: "prima" } });

    await prisma.expense.update({ where: { id }, data: { description: PLAIN } });

    await expectStoredEncrypted(id);
  });

  it("upsert cifra sia quando crea sia quando aggiorna", async () => {
    const data = await expenseData();

    const { id } = await prisma.expense.upsert({ where: { id: "nuovo" }, create: data, update: {} });
    await expectStoredEncrypted(id);

    await prisma.expense.update({ where: { id }, data: { description: "prima" } });
    await prisma.expense.upsert({ where: { id }, create: data, update: { description: PLAIN } });
    await expectStoredEncrypted(id);
  });

  const coveredReads: [string, (id: string) => Promise<{ description: string | null } | null | undefined>][] = [
    ["findMany", async () => (await prisma.expense.findMany())[0]],
    ["findFirst", (id) => prisma.expense.findFirst({ where: { id } })],
    ["findUnique", (id) => prisma.expense.findUnique({ where: { id } })],
  ];

  it.each(coveredReads)("%s restituisce la descrizione in chiaro", async (_, read) => {
    const { id } = await prisma.expense.create({ data: await expenseData() });

    expect((await read(id))?.description).toBe(PLAIN);
  });
});

// BUG: l'estensione elenca a mano le operazioni da intercettare. Quelle che mancano
// salvano la descrizione in chiaro o la restituiscono cifrata. Oggi l'app non le usa,
// ma basterebbe una riga di codice futuro per scrivere dati in chiaro senza accorgersene.
describe("estensione di cifratura: operazioni scoperte", () => {
  const uncoveredWrites: [string, (data: ExpenseData) => Promise<string>][] = [
    [
      "createMany",
      async (data) => {
        await prisma.expense.createMany({ data: [data] });
        return onlyExpenseId();
      },
    ],
    ["createManyAndReturn", async (data) => (await prisma.expense.createManyAndReturn({ data: [data] }))[0].id],
    [
      "updateMany",
      async (data) => {
        const { id } = await prisma.expense.create({ data: { ...data, description: "prima" } });
        await prisma.expense.updateMany({ where: { id }, data: { description: PLAIN } });
        return id;
      },
    ],
    [
      "updateManyAndReturn",
      async (data) => {
        const { id } = await prisma.expense.create({ data: { ...data, description: "prima" } });
        await prisma.expense.updateManyAndReturn({ where: { id }, data: { description: PLAIN } });
        return id;
      },
    ],
    [
      "una create annidata in category.update",
      async ({ categoryId, ...data }) => {
        await prisma.category.update({ where: { id: categoryId }, data: { expenses: { create: data } } });
        return onlyExpenseId();
      },
    ],
  ];

  it.fails.each(uncoveredWrites)("%s salva la descrizione cifrata", async (_, write) => {
    const id = await write(await expenseData());

    await expectStoredEncrypted(id);
  });

  const uncoveredReads: [string, (id: string) => Promise<{ description: string | null }>][] = [
    ["findUniqueOrThrow", (id) => prisma.expense.findUniqueOrThrow({ where: { id } })],
    ["findFirstOrThrow", (id) => prisma.expense.findFirstOrThrow({ where: { id } })],
    [
      "un include da category",
      async () => (await prisma.category.findFirstOrThrow({ include: { expenses: true } })).expenses[0],
    ],
  ];

  it.fails.each(uncoveredReads)("%s restituisce la descrizione in chiaro", async (_, read) => {
    const { id } = await prisma.expense.create({ data: await expenseData() });

    expect((await read(id)).description).toBe(PLAIN);
  });
});
