import { prisma } from "@/lib/prisma";
import type { CreateCategoryInput } from "@/lib/validations/category";
import { InvalidRequestError, NotFoundError, notFoundIfMissing } from "./errors";

/** Le categorie che l'utente vede: quelle predefinite, comuni a tutti, e le sue. */
function visibleTo(userId: string) {
  return { OR: [{ isDefault: true }, { userId }] };
}

/**
 * Un movimento può usare solo una categoria che l'utente vede. Il messaggio è lo stesso
 * per una categoria inesistente e per una di un altro utente: la risposta non rivela quale.
 */
export async function assertUsableCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, ...visibleTo(userId) },
    select: { id: true },
  });
  if (!category) {
    throw new InvalidRequestError("Categoria non valida");
  }
}

export function listCategories(userId: string) {
  return prisma.category.findMany({
    where: visibleTo(userId),
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

/** Il nome dev'essere unico fra le categorie che l'utente vede, predefinite comprese. */
export async function createCategory(userId: string, { name, icon, color }: CreateCategoryInput) {
  const existing = await prisma.category.findFirst({ where: { name, ...visibleTo(userId) } });
  if (existing) {
    throw new InvalidRequestError("Categoria già esistente");
  }

  return prisma.category.create({
    data: { name, icon, color: color || "#6366f1", userId, isDefault: false },
  });
}

/** Si cancellano solo le categorie dell'utente, e solo se nessun movimento le usa. */
export async function deleteCategory(userId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, ...visibleTo(userId) } });
  if (!category) {
    throw new NotFoundError("Categoria non trovata");
  }
  if (category.isDefault) {
    throw new InvalidRequestError("Non puoi eliminare una categoria predefinita");
  }

  const expensesCount = await prisma.expense.count({ where: { categoryId: id } });
  if (expensesCount > 0) {
    throw new InvalidRequestError(`Questa categoria ha ${expensesCount} spese associate. Elimina prima le spese.`);
  }

  try {
    await prisma.category.delete({ where: { id, userId } });
  } catch (error) {
    throw notFoundIfMissing(error, "Categoria non trovata");
  }
}
