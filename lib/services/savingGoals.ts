import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AddContributionInput, CreateSavingGoalInput, UpdateSavingGoalInput } from "@/lib/validations/savingGoal";
import { NotFoundError, notFoundIfMissing } from "./errors";

/** Ogni salvadanaio esce con i suoi versamenti, dal più recente. */
const withContributions = {
  contributions: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.SavingGoalInclude;

export function listSavingGoals(userId: string) {
  return prisma.savingGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: withContributions,
  });
}

export function createSavingGoal(userId: string, { name, emoji, target, due, accent }: CreateSavingGoalInput) {
  return prisma.savingGoal.create({
    data: { name, emoji, target, due, accent, saved: 0, userId },
    include: withContributions,
  });
}

export async function getSavingGoal(userId: string, id: string) {
  const goal = await prisma.savingGoal.findFirst({ where: { id, userId }, include: withContributions });
  if (!goal) {
    throw new NotFoundError("Obiettivo non trovato");
  }
  return goal;
}

export async function updateSavingGoal(userId: string, id: string, input: UpdateSavingGoalInput) {
  try {
    return await prisma.savingGoal.update({ where: { id, userId }, data: input, include: withContributions });
  } catch (error) {
    throw notFoundIfMissing(error, "Obiettivo non trovato");
  }
}

/** I versamenti si cancellano insieme al salvadanaio (onDelete: Cascade nello schema). */
export async function deleteSavingGoal(userId: string, id: string) {
  try {
    await prisma.savingGoal.delete({ where: { id, userId } });
  } catch (error) {
    throw notFoundIfMissing(error, "Obiettivo non trovato");
  }
}

export async function listContributions(userId: string, goalId: string) {
  return (await getSavingGoal(userId, goalId)).contributions;
}

/**
 * Registra un versamento e aggiorna il totale del salvadanaio nella stessa transazione:
 * o succedono entrambe le cose o nessuna, e `saved` resta la somma dei versamenti.
 */
export async function addContribution(userId: string, goalId: string, { amount, date, note }: AddContributionInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Prima il salvadanaio, filtrato per utente: se non è suo la transazione si ferma qui
      await tx.savingGoal.update({ where: { id: goalId, userId }, data: { saved: { increment: amount } } });
      const contribution = await tx.goalContribution.create({ data: { goalId, amount, date, note } });
      const goal = await tx.savingGoal.findUniqueOrThrow({ where: { id: goalId }, include: withContributions });
      return { contribution, goal };
    });
  } catch (error) {
    throw notFoundIfMissing(error, "Obiettivo non trovato");
  }
}
