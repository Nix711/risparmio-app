import { defineConfig } from "vitest/config";

export default defineConfig({
  // Legge l'alias "@/" da tsconfig.json, così non va duplicato qui
  resolve: { tsconfigPaths: true },
  test: {
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
