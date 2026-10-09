import { NextResponse } from "next/server";
import { parseBody, publicRoute } from "@/lib/api/route";
import { registerUser } from "@/lib/services/users";
import { registerSchema } from "@/lib/validations/auth";

export const POST = publicRoute("Errore durante la registrazione", async ({ request }) => {
  const user = await registerUser(await parseBody(request, registerSchema));

  return NextResponse.json({ message: "Utente creato con successo", userId: user.id }, { status: 201 });
});
