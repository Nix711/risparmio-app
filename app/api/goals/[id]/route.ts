import { NextResponse } from "next/server";
import { authedRoute, parseBody } from "@/lib/api/route";
import { serializeMoney } from "@/lib/money";
import { deleteGoal, updateGoal } from "@/lib/services/goals";
import { updateGoalSchema } from "@/lib/validations/goal";

export const PUT = authedRoute<{ id: string }>("Errore nell'aggiornamento del goal", async ({ request, params, userId }) => {
  const goal = await updateGoal(userId, params.id, await parseBody(request, updateGoalSchema));

  return NextResponse.json(serializeMoney(goal));
});

export const DELETE = authedRoute<{ id: string }>("Errore nell'eliminazione del goal", async ({ params, userId }) => {
  await deleteGoal(userId, params.id);

  return NextResponse.json({ message: "Goal eliminato" });
});
