import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

let userCount = 0;

/**
 * Crea un utente con email unica. Senza `password` l'hash non è vero, perché la maggior
 * parte dei test non la verifica; con `password` ne salva un hash bcrypt valido.
 */
export async function createUser(options: { password?: string } = {}) {
  userCount += 1;
  return prisma.user.create({
    data: {
      name: `Utente ${userCount}`,
      email: `utente${userCount}@balancebook.test`,
      // Costo 4 invece del 12 dell'app: l'hash resta verificabile ma si calcola in millisecondi
      password: options.password ? await hash(options.password, 4) : "non-usata",
    },
  });
}

export function createCategory(data: { name: string; userId?: string; isDefault?: boolean }) {
  return prisma.category.create({ data });
}

/** Passa dal client di lib/prisma.ts, quindi la descrizione viene cifrata come in produzione. */
export function createExpense(data: {
  userId: string;
  categoryId: string;
  amount: string;
  date: string;
  type?: "expense" | "income";
  description?: string;
}) {
  return prisma.expense.create({ data: { ...data, date: new Date(data.date) } });
}

/** Un obiettivo mensile (modello Goal): di risparmio o tetto di spesa. */
export function createGoal(data: {
  userId: string;
  name: string;
  targetAmount: string;
  month: number;
  year: number;
  type?: "saving" | "limit";
}) {
  return prisma.goal.create({ data: { type: "limit", ...data } });
}

/** Un salvadanaio (modello SavingGoal), senza versamenti. */
export function createSavingGoal(data: { userId: string; name: string; target: string }) {
  return prisma.savingGoal.create({ data: { due: "2027-07-01", ...data } });
}
