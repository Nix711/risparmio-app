import { NextResponse } from "next/server";
import { authedRoute } from "@/lib/api/route";
import { deleteCategory } from "@/lib/services/categories";

export const DELETE = authedRoute<{ id: string }>("Errore nell'eliminazione della categoria", async ({ params, userId }) => {
  await deleteCategory(userId, params.id);

  return NextResponse.json({ message: "Categoria eliminata" });
});
