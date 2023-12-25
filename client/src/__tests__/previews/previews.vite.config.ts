/** @type {import('vite').UserConfig} */
import { defineConfig, mergeConfig } from "vite";
import viteConfig from "../../../vite.config";
// import WindiCSS from 'vite-plugin-windicss'
import { join } from "path";

export default mergeConfig(viteConfig, defineConfig({
    build: {
        outDir: "build/previews",
        sourcemap: true,
        rollupOptions: {
            input: {                
                app: join(__dirname, "./previews.html")
            }
        },        
    },
    server: {
        open: "/client/src/__tests__/previews/previews.html",
    },
}));
