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
