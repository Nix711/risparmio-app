import { Prisma } from "@prisma/client";
import { changePercent, serializeMoney, sumMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthRange } from "@/lib/utils/date";

/**
 * I dati della dashboard per il mese corrente: totali e variazione sul mese prima,
 * categorie più costose, andamento degli ultimi sei mesi, salvadanai e ultimi movimenti.
 * Gli importi escono già come number, pronti per la pagina.
 */
export async function getDashboardData(userId: string) {
  const { start, end } = getCurrentMonthRange();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    expenses,
    incomes,
    savingGoals,
    previousMonthExpenses,
    previousMonthIncomes,
    trendIncomeRaw,
    trendExpenseRaw,
  ] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, date: { gte: start, lte: end }, type: "expense" },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: start, lte: end }, type: "income" },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.savingGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        type: "expense",
        date: {
          gte: new Date(start.getFullYear(), start.getMonth() - 1, 1),
          lt: start,
        },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        type: "income",
        date: {
          gte: new Date(start.getFullYear(), start.getMonth() - 1, 1),
          lt: start,
        },
      },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: { userId, type: "income", date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true },
    }),
    prisma.expense.findMany({
      where: { userId, type: "expense", date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true },
    }),
  ]);

  const totalExpenses = sumMoney(expenses.map((e) => e.amount));
  const totalIncome = sumMoney(incomes.map((e) => e.amount));
  const netBalance = totalIncome.minus(totalExpenses);

  const prevExp = previousMonthExpenses._sum.amount ?? new Prisma.Decimal(0);
  const prevInc = previousMonthIncomes._sum.amount ?? new Prisma.Decimal(0);
  const expenseChangePct = changePercent(totalExpenses, prevExp);
  const incomeChangePct = changePercent(totalIncome, prevInc);

  // Top categories (expense only)
  const catTotals: Record<string, { amount: Prisma.Decimal; icon: string; color: string }> = {};
  for (const e of expenses) {
    const key = e.category.name;
    if (!catTotals[key]) {
      catTotals[key] = {
        amount: new Prisma.Decimal(0),
        icon: e.category.icon || "📦",
        color: e.category.color || "#7B61FF",
      };
    }
    catTotals[key].amount = catTotals[key].amount.plus(e.amount);
  }
  const topCategories = Object.entries(catTotals)
    .sort(([, a], [, b]) => b.amount.comparedTo(a.amount))
    .slice(0, 4)
    .map(([name, d]) => ({
      name,
      amount: d.amount.toNumber(),
      icon: d.icon,
      color: d.color,
      percent: totalExpenses.isZero()
        ? 0
        : d.amount.dividedBy(totalExpenses).times(100).toNumber(),
    }));

  // 6-month trend data
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = new Intl.DateTimeFormat("it-IT", { month: "short" }).format(d);
    const inMonth = (e: { date: Date }) => {
      const ed = new Date(e.date);
      return `${ed.getFullYear()}-${ed.getMonth()}` === key;
    };
    const income = sumMoney(trendIncomeRaw.filter(inMonth).map((e) => e.amount)).toNumber();
    const expense = sumMoney(trendExpenseRaw.filter(inMonth).map((e) => e.amount)).toNumber();
    return { label, income, expense };
  });

  const allTransactions = [...expenses, ...incomes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return {
    totalExpenses: totalExpenses.toNumber(),
    totalIncome: totalIncome.toNumber(),
    netBalance: netBalance.toNumber(),
    expenseChangePct,
    incomeChangePct,
    savingGoals: serializeMoney(savingGoals),
    recentTransactions: serializeMoney(allTransactions),
    topCategories,
    trendData,
  };
}
