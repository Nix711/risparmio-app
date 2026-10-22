import { NextResponse } from "next/server";
import { authedRoute, parseBody } from "@/lib/api/route";
import { serializeMoney } from "@/lib/money";
import { deleteExpense, updateExpense } from "@/lib/services/expenses";
import { updateExpenseSchema } from "@/lib/validations/expense";

export const PUT = authedRoute<{ id: string }>(
  "Errore nell'aggiornamento della spesa",
  async ({ request, params, userId }) => {
    const expense = await updateExpense(userId, params.id, await parseBody(request, updateExpenseSchema));

    return NextResponse.json(serializeMoney(expense));
  }
);

export const DELETE = authedRoute<{ id: string }>("Errore nell'eliminazione della spesa", async ({ params, userId }) => {
  await deleteExpense(userId, params.id);

  return NextResponse.json({ message: "Spesa eliminata" });
});
