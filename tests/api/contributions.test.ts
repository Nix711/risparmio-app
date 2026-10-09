import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/saving-goals/[id]/contributions/route";
import { prisma } from "@/lib/prisma";
import { createSavingGoal, createUser } from "../helpers/factories";
import { jsonRequest, routeContext } from "../helpers/request";
import { signInAs } from "../helpers/session";

/** Due utenti con un salvadanaio ciascuno; la sessione è del primo. */
async function seedTwoUsers() {
  const [me, other] = await Promise.all([createUser(), createUser()]);
  const [mine, theirs] = await Promise.all([
    createSavingGoal({ userId: me.id, name: "Vacanza", target: "1500.00" }),
    createSavingGoal({ userId: other.id, name: "Auto", target: "8000.00" }),
  ]);
  signInAs(me);
  return { mine, theirs };
}

function contribute(goalId: string, body: unknown) {
  return POST(jsonRequest("POST", `/api/saving-goals/${goalId}/contributions`, body), routeContext(goalId));
}

/** Il totale salvato com'è nel database, come testo per confrontarlo senza passare dai float. */
async function storedSaved(goalId: string) {
  const goal = await prisma.savingGoal.findUniqueOrThrow({ where: { id: goalId } });
  return goal.saved.toFixed(2);
}

describe("POST /api/saving-goals/[id]/contributions", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await contribute("x", { amount: 50, date: "2026-10-01" });

    expect(response.status).toBe(401);
  });

  it("risponde 404 sul salvadanaio di un altro utente e non registra niente", async () => {
    const { theirs } = await seedTwoUsers();

    const response = await contribute(theirs.id, { amount: 50, date: "2026-10-01" });

    expect(response.status).toBe(404);
    expect(await prisma.goalContribution.count()).toBe(0);
    expect(await storedSaved(theirs.id)).toBe("0.00");
  });

  it("risponde 400 con il messaggio di validazione", async () => {
    const { mine } = await seedTwoUsers();

    const response = await contribute(mine.id, { amount: 0, date: "2026-10-01" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "L'importo deve essere maggiore di 0" });
  });

  it("registra il versamento e aggiorna il totale del salvadanaio", async () => {
    const { mine } = await seedTwoUsers();

    const response = await contribute(mine.id, { amount: 50, date: "2026-10-01", note: "Primo" });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      contribution: { amount: 50, note: "Primo" },
      goal: { saved: 50, contributions: [{ amount: 50 }] },
    });
  });

  // Con i float 0.1 + 0.2 darebbe 0.30000000000000004: il totale resta esatto perché lo
  // incrementa Postgres su una colonna numeric(12,2)
  it("tiene il totale esatto su più versamenti", async () => {
    const { mine } = await seedTwoUsers();

    await contribute(mine.id, { amount: 0.1, date: "2026-10-01" });
    await contribute(mine.id, { amount: 0.2, date: "2026-10-02" });

    expect(await storedSaved(mine.id)).toBe("0.30");
  });
});

describe("GET /api/saving-goals/[id]/contributions", () => {
  it("risponde 401 senza sessione", async () => {
    const response = await GET(jsonRequest("GET", "/api/saving-goals/x/contributions"), routeContext("x"));

    expect(response.status).toBe(401);
  });

  it("risponde 404 sul salvadanaio di un altro utente", async () => {
    const { theirs } = await seedTwoUsers();

    const response = await GET(jsonRequest("GET", `/api/saving-goals/${theirs.id}/contributions`), routeContext(theirs.id));

    expect(response.status).toBe(404);
  });

  it("restituisce i versamenti del salvadanaio dell'utente", async () => {
    const { mine } = await seedTwoUsers();
    await contribute(mine.id, { amount: 50, date: "2026-10-01" });

    const response = await GET(jsonRequest("GET", `/api/saving-goals/${mine.id}/contributions`), routeContext(mine.id));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject([{ amount: 50, date: "2026-10-01" }]);
  });
});
