import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getDashboardData } from "@/lib/services/dashboard";
import { createCategory, createExpense, createUser } from "../helpers/factories";

// Il mese corrente è ottobre 2026: settembre è il mese prima, l'andamento va da maggio a ottobre.
// Solo Date è simulato: i timer veri servono a Prisma.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

async function userWithCategory(name = "Spesa") {
  const user = await createUser();
  const category = await createCategory({ name, userId: user.id });
  return { user, category };
}

describe("getDashboardData", () => {
  it("somma entrate e uscite del mese corrente e ne fa il saldo, al centesimo", async () => {
    const { user, category } = await userWithCategory();
    const add = (amount: string, date: string, type: "expense" | "income" = "expense") =>
      createExpense({ userId: user.id, categoryId: category.id, amount, date, type });
    await add("0.10", "2026-10-02");
    await add("0.20", "2026-10-03");
    await add("1000.00", "2026-10-01", "income");
    await add("999.00", "2026-09-30");

    const data = await getDashboardData(user.id);

    expect(data.totalExpenses).toBe(0.3);
    expect(data.totalIncome).toBe(1000);
    expect(data.netBalance).toBe(999.7);
  });

  it("considera solo i movimenti dell'utente", async () => {
    const { user } = await userWithCategory();
    const other = await userWithCategory();
    await createExpense({ userId: other.user.id, categoryId: other.category.id, amount: "50.00", date: "2026-10-05" });

    const data = await getDashboardData(user.id);

    expect(data.totalExpenses).toBe(0);
    expect(data.recentTransactions).toEqual([]);
    expect(data.topCategories).toEqual([]);
  });

  it("calcola la variazione sul mese precedente, e 0 se il mese precedente è vuoto", async () => {
    const { user, category } = await userWithCategory();
    await createExpense({ userId: user.id, categoryId: category.id, amount: "100.00", date: "2026-09-10" });
    await createExpense({ userId: user.id, categoryId: category.id, amount: "150.00", date: "2026-10-10" });
    await createExpense({ userId: user.id, categoryId: category.id, amount: "80.00", date: "2026-10-10", type: "income" });

    const data = await getDashboardData(user.id);

    expect(data.expenseChangePct).toBe(50);
    expect(data.incomeChangePct).toBe(0);
  });

  it("mostra le quattro categorie con più uscite, in ordine, con la quota sul totale", async () => {
    const user = await createUser();
    const amounts = { Casa: "60.00", Spesa: "40.00", Svago: "30.00", Auto: "20.00", Libri: "10.00" };
    for (const [name, amount] of Object.entries(amounts)) {
      const category = await createCategory({ name, userId: user.id });
      await createExpense({ userId: user.id, categoryId: category.id, amount, date: "2026-10-05" });
    }

    const data = await getDashboardData(user.id);

    expect(data.topCategories.map((c) => c.name)).toEqual(["Casa", "Spesa", "Svago", "Auto"]);
    expect(data.topCategories[0]).toMatchObject({ amount: 60, percent: 37.5, icon: "📦", color: "#6366f1" });
  });

  it("riporta l'andamento degli ultimi sei mesi, mese per mese", async () => {
    const { user, category } = await userWithCategory();
    const add = (amount: string, date: string, type: "expense" | "income" = "expense") =>
      createExpense({ userId: user.id, categoryId: category.id, amount, date, type });
    await add("500.00", "2026-04-30");
    await add("10.00", "2026-05-01");
    await add("15.50", "2026-05-20");
    await add("1200.00", "2026-07-01", "income");
    await add("30.00", "2026-10-14");

    const data = await getDashboardData(user.id);

    expect(data.trendData).toEqual([
      { label: "mag", income: 0, expense: 25.5 },
      { label: "giu", income: 0, expense: 0 },
      { label: "lug", income: 1200, expense: 0 },
      { label: "ago", income: 0, expense: 0 },
      { label: "set", income: 0, expense: 0 },
      { label: "ott", income: 0, expense: 30 },
    ]);
  });

  it("elenca gli ultimi cinque movimenti del mese, entrate comprese, con la descrizione in chiaro", async () => {
    const { user, category } = await userWithCategory();
    for (const day of [1, 2, 3, 4, 5]) {
      await createExpense({ userId: user.id, categoryId: category.id, amount: "1.00", date: `2026-10-0${day}`, description: `uscita ${day}` });
    }
    await createExpense({ userId: user.id, categoryId: category.id, amount: "9.00", date: "2026-10-06", type: "income", description: "rimborso" });

    const data = await getDashboardData(user.id);

    expect(data.recentTransactions.map((t) => t.description)).toEqual(["rimborso", "uscita 5", "uscita 4", "uscita 3", "uscita 2"]);
  });

  it("mostra i tre salvadanai creati più di recente", async () => {
    const user = await createUser();
    for (const [name, createdAt] of [["Bici", "2026-01-01"], ["Viaggio", "2026-03-01"], ["Casa", "2026-02-01"], ["Auto", "2026-04-01"]]) {
      await prisma.savingGoal.create({ data: { userId: user.id, name, target: "100.00", due: "2027-01-01", createdAt: new Date(createdAt) } });
    }

    const data = await getDashboardData(user.id);

    expect(data.savingGoals.map((g) => g.name)).toEqual(["Auto", "Viaggio", "Casa"]);
  });
});
