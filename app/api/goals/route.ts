import { NextResponse } from "next/server";
import { authedRoute, parseBody } from "@/lib/api/route";
import { serializeMoney } from "@/lib/money";
import { createGoal, listGoals } from "@/lib/services/goals";
import { createGoalSchema } from "@/lib/validations/goal";

export const GET = authedRoute("Errore nel recupero dei goal", async ({ request, userId }) => {
  const query = new URL(request.url).searchParams;
  const month = query.get("month");
  const year = query.get("year");

  const goals = await listGoals(userId, {
    month: month ? parseInt(month) : undefined,
    year: year ? parseInt(year) : undefined,
  });

  return NextResponse.json(serializeMoney(goals));
});

export const POST = authedRoute("Errore nella creazione del goal", async ({ request, userId }) => {
  const goal = await createGoal(userId, await parseBody(request, createGoalSchema));

  return NextResponse.json(serializeMoney(goal), { status: 201 });
});
