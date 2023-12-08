import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  build: { outDir: "build/webapp" },
  plugins: [
    tsconfigPaths(),
    react({
      /** needed to support typescript decorations */
      babel: {
        parserOpts: {
          plugins: ["decorators-legacy", "classProperties"],
        },
      },
    }),
    svgr({
      svgrOptions: {
        icon: true,
      },
    }),
  ],
});
