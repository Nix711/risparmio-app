import { NextResponse } from "next/server";
import { authedRoute, parseBody } from "@/lib/api/route";
import { serializeMoney } from "@/lib/money";
import { createSavingGoal, listSavingGoals } from "@/lib/services/savingGoals";
import { createSavingGoalSchema } from "@/lib/validations/savingGoal";

export const GET = authedRoute("Errore nel recupero degli obiettivi", async ({ userId }) => {
  return NextResponse.json(serializeMoney(await listSavingGoals(userId)));
});

export const POST = authedRoute("Errore nella creazione dell'obiettivo", async ({ request, userId }) => {
  const goal = await createSavingGoal(userId, await parseBody(request, createSavingGoalSchema));

  return NextResponse.json(serializeMoney(goal), { status: 201 });
});
