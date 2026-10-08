import { prisma } from "@/lib/prisma";

/** La descrizione com'è salvata: $queryRaw non passa dall'estensione di lib/prisma.ts che la decifra. */
export async function storedDescription(id: string) {
  const [row] = await prisma.$queryRaw<{ description: string }[]>`
    SELECT description FROM "Expense" WHERE id = ${id}
  `;
  return row.description;
}
