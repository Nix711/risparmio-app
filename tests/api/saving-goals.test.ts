import { describe, expect, it } from "vitest";
import * as item from "@/app/api/saving-goals/[id]/route";
import * as collection from "@/app/api/saving-goals/route";
import { prisma } from "@/lib/prisma";
import { createSavingGoal, createUser } from "../helpers/factories";
import { jsonRequest, routeContext } from "../helpers/request";
import { signInAs } from "../helpers/session";

type SavingGoalResponse = {
  name: string;
  emoji: string;
  accent: string;
  saved: number;
  target: number;
  contributions: { amount: number }[];
};

/** Due utenti con un salvadanaio ciascuno; la sessione è del primo. */
async function seedTwoUsers() {
  const [me, other] = await Promise.all([createUser(), createUser()]);
  const [mine, theirs] = await Promise.all([
    createSavingGoal({ userId: me.id, name: "Vacanza", target: "1500.00" }),
    createSavingGoal({ userId: other.id, name: "Auto", target: "8000.00" }),
  ]);
  signInAs(me);
  return { me, mine, theirs };
}

describe("GET /api/saving-goals", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await collection.GET();

    expect(response.status).toBe(401);
  });

  it("restituisce solo i salvadanai dell'utente, con i versamenti e importi numerici", async () => {
    const { mine } = await seedTwoUsers();
    await prisma.goalContribution.create({ data: { goalId: mine.id, amount: "50.00", date: "2026-10-01" } });

    const response = await collection.GET();
    const goals: SavingGoalResponse[] = await response.json();

    expect(response.status).toBe(200);
    expect(goals).toHaveLength(1);
    expect(goals[0]).toMatchObject({ name: "Vacanza", target: 1500, contributions: [{ amount: 50 }] });
  });
});

describe("POST /api/saving-goals", () => {
  const body = { name: "Vacanza", target: 1500, due: "2027-07-01" };

  it("risponde 401 senza sessione", async () => {
    const response = await collection.POST(jsonRequest("POST", "/api/saving-goals", body));

    expect(response.status).toBe(401);
  });

  it("risponde 400 con il messaggio di validazione", async () => {
    signInAs(await createUser());

    const response = await collection.POST(jsonRequest("POST", "/api/saving-goals", { ...body, target: 0 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "L'obiettivo deve essere maggiore di 0" });
  });

  it("crea un salvadanaio vuoto con emoji e colore predefiniti", async () => {
    signInAs(await createUser());

    const response = await collection.POST(jsonRequest("POST", "/api/saving-goals", body));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      name: "Vacanza",
      emoji: "🎯",
      accent: "#A78BFA",
      saved: 0,
      target: 1500,
      contributions: [],
    });
  });
});

describe("GET /api/saving-goals/[id]", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await item.GET(jsonRequest("GET", "/api/saving-goals/x"), routeContext("x"));

    expect(response.status).toBe(401);
  });

  it("risponde 404 su un salvadanaio di un altro utente", async () => {
    const { theirs } = await seedTwoUsers();

    const response = await item.GET(jsonRequest("GET", `/api/saving-goals/${theirs.id}`), routeContext(theirs.id));

    expect(response.status).toBe(404);
  });

  it("restituisce il salvadanaio dell'utente", async () => {
    const { mine } = await seedTwoUsers();

    const response = await item.GET(jsonRequest("GET", `/api/saving-goals/${mine.id}`), routeContext(mine.id));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: "Vacanza", target: 1500 });
  });
});

describe("PUT /api/saving-goals/[id]", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await item.PUT(jsonRequest("PUT", "/api/saving-goals/x", { name: "Viaggio" }), routeContext("x"));

    expect(response.status).toBe(401);
  });

  it("risponde 404 su un salvadanaio di un altro utente e non lo modifica", async () => {
    const { theirs } = await seedTwoUsers();

    const response = await item.PUT(jsonRequest("PUT", `/api/saving-goals/${theirs.id}`, { name: "Rubato" }), routeContext(theirs.id));
    const unchanged = await prisma.savingGoal.findUnique({ where: { id: theirs.id } });

    expect(response.status).toBe(404);
    expect(unchanged?.name).toBe("Auto");
  });

  it("risponde 400 con un colore non valido", async () => {
    const { mine } = await seedTwoUsers();

    const response = await item.PUT(jsonRequest("PUT", `/api/saving-goals/${mine.id}`, { accent: "red" }), routeContext(mine.id));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Colore non valido" });
  });

  it("aggiorna solo i campi inviati", async () => {
    const { mine } = await seedTwoUsers();

    const response = await item.PUT(jsonRequest("PUT", `/api/saving-goals/${mine.id}`, { name: "Viaggio" }), routeContext(mine.id));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: "Viaggio", emoji: "🎯", accent: "#A78BFA", target: 1500 });
  });
});

describe("DELETE /api/saving-goals/[id]", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await item.DELETE(jsonRequest("DELETE", "/api/saving-goals/x"), routeContext("x"));

    expect(response.status).toBe(401);
  });

  it("risponde 404 su un salvadanaio di un altro utente e non lo cancella", async () => {
    const { theirs } = await seedTwoUsers();

    const response = await item.DELETE(jsonRequest("DELETE", `/api/saving-goals/${theirs.id}`), routeContext(theirs.id));

    expect(response.status).toBe(404);
    expect(await prisma.savingGoal.count({ where: { id: theirs.id } })).toBe(1);
  });

  it("cancella il salvadanaio dell'utente insieme ai suoi versamenti", async () => {
    const { mine } = await seedTwoUsers();
    await prisma.goalContribution.create({ data: { goalId: mine.id, amount: "50.00", date: "2026-10-01" } });

    const response = await item.DELETE(jsonRequest("DELETE", `/api/saving-goals/${mine.id}`), routeContext(mine.id));

    expect(response.status).toBe(200);
    expect(await prisma.savingGoal.count({ where: { id: mine.id } })).toBe(0);
    expect(await prisma.goalContribution.count({ where: { goalId: mine.id } })).toBe(0);
  });
});
