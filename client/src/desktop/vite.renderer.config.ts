import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config
export default defineConfig(({ mode }) => {
  process.env.NODE_ENV = mode; // Force use mode (fixes HMR for vite plugins)

  return {
    build: {
      sourcemap: true,
    },
    plugins: [
      react({
        /** needed to support typescript decorations */
        babel: {
          parserOpts: {
            plugins: ["decorators-legacy", "classProperties"],
          },
        },
      }),
    ],
    server: {
      hmr: true,
    },
  };
});
