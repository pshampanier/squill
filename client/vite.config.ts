import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  /** need to set the base, otherwise the breakpoint would not bind in vscode */
  base: "/client/",
  build: {
    outDir: "build/webapp",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
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
