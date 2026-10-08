import { prisma } from "@/lib/prisma";

let userCount = 0;

/** Crea un utente con email unica. La password non è un hash vero: i test non fanno login. */
export function createUser() {
  userCount += 1;
  return prisma.user.create({
    data: {
      name: `Utente ${userCount}`,
      email: `utente${userCount}@balancebook.test`,
      password: "non-usata",
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
