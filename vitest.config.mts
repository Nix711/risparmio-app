import { defineConfig } from "vitest/config";

export default defineConfig({
  // Legge l'alias "@/" da tsconfig.json, così non va duplicato qui
  resolve: { tsconfigPaths: true },
  test: {
    env: {
      // Chiave di prova, non un segreto: è "test-key-for-vitest-32-bytes!!!!" in base64
      ENCRYPTION_KEY: "dGVzdC1rZXktZm9yLXZpdGVzdC0zMi1ieXRlcyEhISE=",
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
