import { compare } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { createUser } from "../helpers/factories";
import { jsonRequest } from "../helpers/request";

const body = {
  name: "Utente Demo",
  email: "nuovo@balancebook.test",
  password: "demo1234",
  confirmPassword: "demo1234",
};

function register(data: unknown) {
  return POST(jsonRequest("POST", "/api/auth/register", data));
}

describe("POST /api/auth/register", () => {
  it("risponde 400 con il messaggio di validazione", async () => {
    const response = await register({ ...body, confirmPassword: "altro" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Le password non corrispondono" });
  });

  it("crea l'utente e salva l'hash della password, non la password", async () => {
    const response = await register(body);
    const { userId } = await response.json();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(response.status).toBe(201);
    expect(user.email).toBe("nuovo@balancebook.test");
    expect(user.password).not.toContain("demo1234");
    expect(await compare("demo1234", user.password)).toBe(true);
  });

  it("rifiuta un'email già registrata", async () => {
    const existing = await createUser();

    const response = await register({ ...body, email: existing.email });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Email già registrata" });
    expect(await prisma.user.count({ where: { email: existing.email } })).toBe(1);
  });
});
