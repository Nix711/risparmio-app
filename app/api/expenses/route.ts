import { NextResponse } from "next/server";
import { authedRoute, parseBody } from "@/lib/api/route";
import { serializeMoney } from "@/lib/money";
import { createExpense, listExpenses } from "@/lib/services/expenses";
import { createExpenseSchema, transactionTypeSchema } from "@/lib/validations/expense";

export const GET = authedRoute("Errore nel recupero delle transazioni", async ({ request, userId }) => {
  const query = new URL(request.url).searchParams;
  const month = query.get("month");
  const year = query.get("year");
  const type = transactionTypeSchema.safeParse(query.get("type"));

  const expenses = await listExpenses(userId, {
    ...(month && year ? { month: parseInt(month), year: parseInt(year) } : {}),
    categoryId: query.get("categoryId") ?? undefined,
    // Un tipo sconosciuto non filtra, invece di dare errore
    type: type.success ? type.data : undefined,
  });

  return NextResponse.json(serializeMoney(expenses));
});

export const POST = authedRoute("Errore nella creazione della transazione", async ({ request, userId }) => {
  const expense = await createExpense(userId, await parseBody(request, createExpenseSchema));

  return NextResponse.json(serializeMoney(expense), { status: 201 });
});
