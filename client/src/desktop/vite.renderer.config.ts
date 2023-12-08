import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";

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
      tsconfigPaths(),
      svgr({
        svgrOptions: {
          icon: true,
        },
      }),
    ],
    server: {
      hmr: true,
    },
  };
});
