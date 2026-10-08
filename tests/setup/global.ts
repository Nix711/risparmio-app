import { execFileSync } from "node:child_process";
import type { TestProject } from "vitest/node";
import { assertTestDatabase } from "./database";

/** Eseguito una volta prima dei test d'integrazione: porta il database di test all'ultima migration. */
export default function setup(project: TestProject) {
  // La URL viene dalla configurazione del progetto integration, l'unico posto in cui è scritta
  const url = project.config.env.DATABASE_URL;
  assertTestDatabase(url);

  try {
    // Prisma crea il database se non esiste. La URL passata qui vince su .env, perché
    // process.loadEnvFile() in prisma.config.ts non sovrascrive le variabili già impostate.
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe",
    });
  } catch (error) {
    const output = String((error as { stdout?: Buffer }).stdout ?? "") + String((error as { stderr?: Buffer }).stderr ?? "");
    if (output.includes("P1001")) {
      throw new Error(`Postgres non raggiungibile su ${new URL(url).host}: avvialo con \`npm run db:up\``);
    }
    throw new Error(`prisma migrate deploy non riuscito:\n${output}`);
  }
}
