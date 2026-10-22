import { prisma } from "@/lib/prisma";
import type { CreateGoalInput, UpdateGoalInput } from "@/lib/validations/goal";
import { InvalidRequestError, notFoundIfMissing } from "./errors";

export interface GoalFilters {
  month?: number;
  year?: number;
}

/** Gli obiettivi mensili dell'utente, in ordine di nome. Un filtro undefined non filtra. */
export function listGoals(userId: string, { month, year }: GoalFilters = {}) {
  return prisma.goal.findMany({
    where: { userId, month, year },
    orderBy: { name: "asc" },
  });
}

/** Un nome si può usare una sola volta per mese. */
export async function createGoal(userId: string, { name, targetAmount, type, month, year }: CreateGoalInput) {
  const existing = await prisma.goal.findFirst({ where: { userId, name, month, year } });
  if (existing) {
    throw new InvalidRequestError("Goal già esistente per questo mese");
  }

  return prisma.goal.create({
    data: { name, targetAmount, type, month, year, userId },
  });
}

export async function updateGoal(userId: string, id: string, input: UpdateGoalInput) {
  try {
    return await prisma.goal.update({ where: { id, userId }, data: input });
  } catch (error) {
    throw notFoundIfMissing(error, "Goal non trovato");
  }
}

export async function deleteGoal(userId: string, id: string) {
  try {
    await prisma.goal.delete({ where: { id, userId } });
  } catch (error) {
    throw notFoundIfMissing(error, "Goal non trovato");
  }
}
