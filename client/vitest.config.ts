import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      root: "src",
      coverage: {
        enabled: true,
        reporter: ["html"],
        reportsDirectory: "../build/coverage",
        exclude: ["**/*.config.js", "**/*.d.ts", "**/__tests__/previews/*"],
      },
    },
  })
);
