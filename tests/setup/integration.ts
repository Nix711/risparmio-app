import { afterAll, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { signOut } from "../helpers/session";
import { assertTestDatabase } from "./database";

// I route handler leggono la sessione da auth(): nei test la decidono signInAs() e signOut()
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

beforeEach(async () => {
  assertTestDatabase(process.env.DATABASE_URL);

  // Ogni test parte da un database vuoto e senza sessione, e crea solo ciò che gli serve
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);

  signOut();
});

afterAll(async () => {
  await prisma.$disconnect();
});
