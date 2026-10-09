import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { authedRoute, parseBody, publicRoute } from "@/lib/api/route";
import { InvalidRequestError, NotFoundError } from "@/lib/services/errors";
import { createUser } from "../helpers/factories";
import { jsonRequest, routeContext } from "../helpers/request";
import { signInAs } from "../helpers/session";

const request = () => jsonRequest("GET", "/api/prova");

describe("authedRoute", () => {
  it("senza sessione risponde 401 e non esegue l'handler", async () => {
    const handler = vi.fn();

    const response = await authedRoute("Errore", handler)(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Non autorizzato" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("passa all'handler l'utente della sessione e i parametri della route", async () => {
    const user = await createUser();
    signInAs(user);
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));

    const response = await authedRoute<{ id: string }>("Errore", handler)(request(), routeContext("abc"));

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id, params: { id: "abc" } }));
  });

  it("traduce gli errori dei servizi come publicRoute", async () => {
    signInAs(await createUser());

    const response = await authedRoute("Errore", async () => {
      throw new NotFoundError("Spesa non trovata");
    })(request());

    expect(response.status).toBe(404);
  });
});

describe("publicRoute", () => {
  it("esegue l'handler senza sessione, con parametri vuoti se la route non ne ha", async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));

    const response = await publicRoute("Errore", handler)(request());

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: {} }));
  });

  it("risponde 404 con il messaggio di NotFoundError", async () => {
    const response = await publicRoute("Errore", async () => {
      throw new NotFoundError("Spesa non trovata");
    })(request());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Spesa non trovata" });
  });

  it("risponde 400 con il messaggio di InvalidRequestError", async () => {
    const response = await publicRoute("Errore", async () => {
      throw new InvalidRequestError("Categoria già esistente");
    })(request());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Categoria già esistente" });
  });

  it("risponde 500 con il messaggio della route a ogni altro errore, senza esporre quello vero, e lo scrive nel log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("password di Postgres sbagliata");

    const response = await publicRoute("Errore nel recupero delle spese", async () => {
      throw error;
    })(request());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Errore nel recupero delle spese" });
    expect(log).toHaveBeenCalledWith("Errore nel recupero delle spese", error);
  });
});

describe("parseBody", () => {
  const schema = z.object({
    name: z.string().min(1, "Nome richiesto"),
    color: z.string().default("#6366f1"),
  });

  it("restituisce i dati validati, con i valori di default dello schema", async () => {
    const body = await parseBody(jsonRequest("POST", "/api/prova", { name: "Casa" }), schema);

    expect(body).toEqual({ name: "Casa", color: "#6366f1" });
  });

  it("con dati non validi lancia InvalidRequestError con il primo messaggio di Zod", async () => {
    const parsing = parseBody(jsonRequest("POST", "/api/prova", { name: "" }), schema);

    await expect(parsing).rejects.toThrow(InvalidRequestError);
    await expect(parsing).rejects.toThrow("Nome richiesto");
  });

  it.each([
    ["un corpo che non è JSON", "{nome: Casa"],
    ["un corpo vuoto", ""],
  ])("con %s lancia InvalidRequestError", async (_, body) => {
    const parsing = parseBody(new Request("http://localhost/api/prova", { method: "POST", body }), schema);

    await expect(parsing).rejects.toThrow(InvalidRequestError);
    await expect(parsing).rejects.toThrow("Richiesta non valida");
  });

  // È un errore di chi chiama, non del server: un 500 finirebbe anche nel log degli errori
  it("in una route, un corpo che non è JSON riceve 400 e non 500", async () => {
    signInAs(await createUser());
    const route = authedRoute("Errore nella creazione", async ({ request }) => {
      await parseBody(request, schema);
      return NextResponse.json({ ok: true });
    });

    const response = await route(new Request("http://localhost/api/prova", { method: "POST", body: "{nome: Casa" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Richiesta non valida" });
  });
});
