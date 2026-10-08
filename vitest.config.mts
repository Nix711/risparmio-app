import { defineConfig } from "vitest/config";

// Stesso container Postgres dello sviluppo, ma un database separato: i dati demo restano intatti
const TEST_DATABASE_URL = "postgresql://balancebook:balancebook@127.0.0.1:5432/balancebook_test";

export default defineConfig({
  // Legge l'alias "@/" da tsconfig.json, così non va duplicato qui
  resolve: { tsconfigPaths: true },
  test: {
    env: {
      // Chiave di prova, non un segreto: è "test-key-for-vitest-32-bytes!!!!" in base64
      ENCRYPTION_KEY: "dGVzdC1rZXktZm9yLXZpdGVzdC0zMi1ieXRlcyEhISE=",
      // Fuso fisso, come sui server di Vercel e su GitHub Actions: senza, le date
      // cambierebbero giorno a seconda della macchina su cui girano i test
      TZ: "UTC",
    },
    // Dopo ogni test ripristina le variabili cambiate con vi.stubEnv e le funzioni spiate con vi.spyOn
    unstubEnvs: true,
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["lib/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/**/*.test.ts"],
          env: { DATABASE_URL: TEST_DATABASE_URL },
          globalSetup: ["tests/setup/global.ts"],
          setupFiles: ["tests/setup/integration.ts"],
          // I file condividono un database: in parallelo uno svuoterebbe le tabelle mentre un altro le usa
          fileParallelism: false,
        },
      },
    ],
  },
});
