import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Con prisma.config.ts presente, la CLI di Prisma non carica più .env da sola.
// In locale lo carichiamo noi; su Vercel il file non esiste e le variabili
// arrivano dall'ambiente, che ha comunque la precedenza su quelle del file.
if (existsSync(".env")) {
  process.loadEnvFile();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // Eseguito da `prisma db seed` e in automatico da `prisma migrate reset`
    seed: "tsx prisma/seed.ts",
  },
});
