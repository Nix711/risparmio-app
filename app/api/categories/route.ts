import { NextResponse } from "next/server";
import { authedRoute, parseBody } from "@/lib/api/route";
import { createCategory, listCategories } from "@/lib/services/categories";
import { createCategorySchema } from "@/lib/validations/category";

export const GET = authedRoute("Errore nel recupero delle categorie", async ({ userId }) => {
  return NextResponse.json(await listCategories(userId));
});

export const POST = authedRoute("Errore nella creazione della categoria", async ({ request, userId }) => {
  const category = await createCategory(userId, await parseBody(request, createCategorySchema));

  return NextResponse.json(category, { status: 201 });
});
