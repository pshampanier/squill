import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      root: "src",
      environment: "happy-dom",
      coverage: {
        enabled: true,
        reporter: ["json", "html"],
        reportsDirectory: "../../build/webapp/coverage",
        exclude: ["**/*.config.js", "**/*.d.ts", "**/__tests__/previews/*"],
        all: true,
      },
    },
  })
);
