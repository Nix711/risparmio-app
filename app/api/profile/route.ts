import { NextResponse } from "next/server";
import { authedRoute, parseBody } from "@/lib/api/route";
import { getProfile, updateProfile } from "@/lib/services/users";
import { updateProfileSchema } from "@/lib/validations/profile";

export const GET = authedRoute("Errore nel recupero del profilo", async ({ userId }) => {
  return NextResponse.json(await getProfile(userId));
});

export const PUT = authedRoute("Errore nell'aggiornamento del profilo", async ({ request, userId }) => {
  return NextResponse.json(await updateProfile(userId, await parseBody(request, updateProfileSchema)));
});
