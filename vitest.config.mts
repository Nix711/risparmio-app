import { defineConfig } from "vitest/config";

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
    ],
  },
});
