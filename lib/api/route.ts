import { NextResponse } from "next/server";
import type { z } from "zod";
import { auth } from "@/lib/auth";
import { InvalidRequestError, NotFoundError } from "@/lib/services/errors";

type Params = Record<string, string>;

type Handler<P extends Params, Input> = (input: Input & { request: Request; params: P }) => Promise<Response>;

/**
 * Avvolge un route handler: traduce gli errori dei servizi in 404 e 400, e ogni altro
 * errore in un 500 con `fallbackError`, il messaggio che vede l'utente.
 */
export function publicRoute<P extends Params = Record<string, never>>(fallbackError: string, handler: Handler<P, object>) {
  // Next passa sempre il contesto; i test delle route senza parametri chiamano l'handler con la sola richiesta
  return async (request: Request, context?: { params: Promise<P> }): Promise<Response> => {
    try {
      const params = context ? await context.params : ({} as P);
      return await handler({ request, params });
    } catch (error) {
      return errorResponse(error, fallbackError);
    }
  };
}

/** Come publicRoute, ma senza sessione risponde 401 e all'handler passa l'utente collegato. */
export function authedRoute<P extends Params = Record<string, never>>(
  fallbackError: string,
  handler: Handler<P, { userId: string }>
) {
  return publicRoute<P>(fallbackError, async ({ request, params }) => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
    return handler({ request, params, userId: session.user.id });
  });
}

/** Legge il corpo JSON e lo valida. Con dati non validi lancia InvalidRequestError con il primo messaggio di Zod. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  const result = schema.safeParse(await request.json());
  if (!result.success) {
    throw new InvalidRequestError(result.error.issues[0].message);
  }
  return result.data;
}

function errorResponse(error: unknown, fallbackError: string) {
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof InvalidRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(fallbackError, error);
  return NextResponse.json({ error: fallbackError }, { status: 500 });
}
