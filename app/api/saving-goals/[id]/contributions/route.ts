import { NextResponse } from "next/server";
import { authedRoute, parseBody } from "@/lib/api/route";
import { serializeMoney } from "@/lib/money";
import { addContribution, listContributions } from "@/lib/services/savingGoals";
import { addContributionSchema } from "@/lib/validations/savingGoal";

export const GET = authedRoute<{ id: string }>("Errore nel recupero dei contributi", async ({ params, userId }) => {
  return NextResponse.json(serializeMoney(await listContributions(userId, params.id)));
});

export const POST = authedRoute<{ id: string }>("Errore nell'aggiunta del contributo", async ({ request, params, userId }) => {
  const result = await addContribution(userId, params.id, await parseBody(request, addContributionSchema));

  return NextResponse.json(serializeMoney(result), { status: 201 });
});
