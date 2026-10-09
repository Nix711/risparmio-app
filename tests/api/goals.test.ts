import { describe, expect, it } from "vitest";
import { DELETE, PUT } from "@/app/api/goals/[id]/route";
import { GET, POST } from "@/app/api/goals/route";
import { prisma } from "@/lib/prisma";
import { createGoal, createUser } from "../helpers/factories";
import { jsonRequest, routeContext } from "../helpers/request";
import { signInAs } from "../helpers/session";

type GoalResponse = { name: string; targetAmount: number; currentAmount: number; month: number };

/** Due utenti; la sessione è del primo. */
async function seedTwoUsers() {
  const [me, other] = await Promise.all([createUser(), createUser()]);
  signInAs(me);
  return { me, other };
}

describe("GET /api/goals", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await GET(jsonRequest("GET", "/api/goals"));

    expect(response.status).toBe(401);
  });

  it("restituisce solo gli obiettivi dell'utente, in ordine di nome, con importi numerici", async () => {
    const { me, other } = await seedTwoUsers();
    await createGoal({ userId: me.id, name: "Svago", targetAmount: "100.00", month: 10, year: 2026 });
    await createGoal({ userId: me.id, name: "Spesa", targetAmount: "300.50", month: 10, year: 2026 });
    await createGoal({ userId: other.id, name: "Altro", targetAmount: "50.00", month: 10, year: 2026 });

    const response = await GET(jsonRequest("GET", "/api/goals"));
    const goals: GoalResponse[] = await response.json();

    expect(response.status).toBe(200);
    expect(goals.map(({ name, targetAmount }) => ({ name, targetAmount }))).toEqual([
      { name: "Spesa", targetAmount: 300.5 },
      { name: "Svago", targetAmount: 100 },
    ]);
  });

  it("filtra per mese e anno", async () => {
    const { me } = await seedTwoUsers();
    await createGoal({ userId: me.id, name: "Spesa", targetAmount: "300.00", month: 10, year: 2026 });
    await createGoal({ userId: me.id, name: "Spesa", targetAmount: "300.00", month: 11, year: 2026 });

    const response = await GET(jsonRequest("GET", "/api/goals?month=10&year=2026"));
    const goals: GoalResponse[] = await response.json();

    expect(goals.map(({ month }) => month)).toEqual([10]);
  });
});

describe("POST /api/goals", () => {
  const body = { name: "Spesa", targetAmount: 300.5, type: "limit", month: 10, year: 2026 };

  it("risponde 401 senza sessione", async () => {
    const response = await POST(jsonRequest("POST", "/api/goals", body));

    expect(response.status).toBe(401);
  });

  it("risponde 400 con dati non validi", async () => {
    await seedTwoUsers();

    const response = await POST(jsonRequest("POST", "/api/goals", { ...body, month: 13 }));

    expect(response.status).toBe(400);
  });

  it("crea l'obiettivo e risponde 201", async () => {
    await seedTwoUsers();

    const response = await POST(jsonRequest("POST", "/api/goals", body));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ...body, currentAmount: 0 });
  });

  it("rifiuta un obiettivo con lo stesso nome nello stesso mese", async () => {
    const { me } = await seedTwoUsers();
    await createGoal({ userId: me.id, name: "Spesa", targetAmount: "100.00", month: 10, year: 2026 });

    const response = await POST(jsonRequest("POST", "/api/goals", body));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Goal già esistente per questo mese" });
  });
});

describe("PUT /api/goals/[id]", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await PUT(jsonRequest("PUT", "/api/goals/x", { currentAmount: 1 }), routeContext("x"));

    expect(response.status).toBe(401);
  });

  it("risponde 404 su un obiettivo di un altro utente e non lo modifica", async () => {
    const { other } = await seedTwoUsers();
    const theirs = await createGoal({ userId: other.id, name: "Spesa", targetAmount: "300.00", month: 10, year: 2026 });

    const response = await PUT(jsonRequest("PUT", `/api/goals/${theirs.id}`, { currentAmount: 1 }), routeContext(theirs.id));
    const unchanged = await prisma.goal.findUnique({ where: { id: theirs.id } });

    expect(response.status).toBe(404);
    expect(unchanged?.currentAmount.toFixed(2)).toBe("0.00");
  });

  it("risponde 400 con un importo raggiunto negativo", async () => {
    const { me } = await seedTwoUsers();
    const mine = await createGoal({ userId: me.id, name: "Spesa", targetAmount: "300.00", month: 10, year: 2026 });

    const response = await PUT(jsonRequest("PUT", `/api/goals/${mine.id}`, { currentAmount: -1 }), routeContext(mine.id));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "L'importo non può essere negativo" });
  });

  it("aggiorna l'obiettivo dell'utente", async () => {
    const { me } = await seedTwoUsers();
    const mine = await createGoal({ userId: me.id, name: "Spesa", targetAmount: "300.00", month: 10, year: 2026 });

    const response = await PUT(jsonRequest("PUT", `/api/goals/${mine.id}`, { currentAmount: 120.25 }), routeContext(mine.id));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: "Spesa", targetAmount: 300, currentAmount: 120.25 });
  });
});

describe("DELETE /api/goals/[id]", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await DELETE(jsonRequest("DELETE", "/api/goals/x"), routeContext("x"));

    expect(response.status).toBe(401);
  });

  it("risponde 404 su un obiettivo di un altro utente e non lo cancella", async () => {
    const { other } = await seedTwoUsers();
    const theirs = await createGoal({ userId: other.id, name: "Spesa", targetAmount: "300.00", month: 10, year: 2026 });

    const response = await DELETE(jsonRequest("DELETE", `/api/goals/${theirs.id}`), routeContext(theirs.id));

    expect(response.status).toBe(404);
    expect(await prisma.goal.count({ where: { id: theirs.id } })).toBe(1);
  });

  it("cancella l'obiettivo dell'utente", async () => {
    const { me } = await seedTwoUsers();
    const mine = await createGoal({ userId: me.id, name: "Spesa", targetAmount: "300.00", month: 10, year: 2026 });

    const response = await DELETE(jsonRequest("DELETE", `/api/goals/${mine.id}`), routeContext(mine.id));

    expect(response.status).toBe(200);
    expect(await prisma.goal.count({ where: { id: mine.id } })).toBe(0);
  });
});
