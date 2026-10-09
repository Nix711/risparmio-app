import { prisma } from "@/lib/prisma";
import type { CreateExpenseInput, TransactionType, UpdateExpenseInput } from "@/lib/validations/expense";
import { notFoundIfMissing } from "./errors";

export interface ExpenseFilters {
  /** Da 1 a 12. Filtra solo insieme a `year`. */
  month?: number;
  year?: number;
  categoryId?: string;
  type?: TransactionType;
}

/** I movimenti dell'utente, dal più recente, con la loro categoria. */
export function listExpenses(userId: string, { month, year, categoryId, type }: ExpenseFilters = {}) {
  return prisma.expense.findMany({
    where: {
      userId,
      ...(month !== undefined && year !== undefined && {
        date: { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59) },
      }),
      ...(categoryId && { categoryId }),
      ...(type && { type }),
    },
    include: { category: true },
    orderBy: { date: "desc" },
  });
}

export function createExpense(userId: string, { amount, description, categoryId, date, type }: CreateExpenseInput) {
  return prisma.expense.create({
    data: { amount, description, categoryId, date: new Date(date), type, userId },
    include: { category: true },
  });
}

/** Aggiorna solo i campi presenti in `input`: per Prisma un campo undefined resta com'è. */
export async function updateExpense(userId: string, id: string, input: UpdateExpenseInput) {
  const { amount, description, categoryId, date, type } = input;
  try {
    return await prisma.expense.update({
      // userId nella scrittura stessa: il movimento di un altro utente risulta inesistente
      where: { id, userId },
      data: { amount, description, categoryId, type, date: date === undefined ? undefined : new Date(date) },
      include: { category: true },
    });
  } catch (error) {
    throw notFoundIfMissing(error, "Spesa non trovata");
  }
}

export async function deleteExpense(userId: string, id: string) {
  try {
    await prisma.expense.delete({ where: { id, userId } });
  } catch (error) {
    throw notFoundIfMissing(error, "Spesa non trovata");
  }
}
