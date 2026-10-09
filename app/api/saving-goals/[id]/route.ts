import { NextResponse } from "next/server";
import { authedRoute, parseBody } from "@/lib/api/route";
import { serializeMoney } from "@/lib/money";
import { deleteSavingGoal, getSavingGoal, updateSavingGoal } from "@/lib/services/savingGoals";
import { updateSavingGoalSchema } from "@/lib/validations/savingGoal";

export const GET = authedRoute<{ id: string }>("Errore nel recupero dell'obiettivo", async ({ params, userId }) => {
  return NextResponse.json(serializeMoney(await getSavingGoal(userId, params.id)));
});

export const PUT = authedRoute<{ id: string }>(
  "Errore nell'aggiornamento dell'obiettivo",
  async ({ request, params, userId }) => {
    const goal = await updateSavingGoal(userId, params.id, await parseBody(request, updateSavingGoalSchema));

    return NextResponse.json(serializeMoney(goal));
  }
);

export const DELETE = authedRoute<{ id: string }>("Errore nell'eliminazione dell'obiettivo", async ({ params, userId }) => {
  await deleteSavingGoal(userId, params.id);

  return NextResponse.json({ message: "Obiettivo eliminato" });
});
