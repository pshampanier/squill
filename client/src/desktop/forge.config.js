import path from "path";

// eslint-disable-next-line no-undef
const rootDir = process.cwd();

// eslint-disable-next-line no-undef
module.exports = {
  packagerConfig: {
    asar: false,
    executableName: "ElectroVite",
    appCopyright: "Copyright (C) 2023 Guasam, ElectroVite",
    icon: path.resolve("assets/favicon.ico"),
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {},
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-vite",
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: path.join(rootDir, "src/desktop/main/main.ts"),
            config: path.join(rootDir, "src/desktop/vite.main.config.ts"),
          },
          {
            entry: path.join(rootDir, "src/desktop/preload/preload.ts"),
            config: path.join(rootDir, "src/desktop/vite.preload.config.ts"),
          },
        ],
        renderer: [
          {
            // Name becomes available in main/main.ts in capital case format: 'MAIN_WINDOW_**'
            name: "main_window",
            config: path.join(rootDir, "src/desktop/vite.renderer.config.ts"),
          },
        ],
      },
    },
  ],
};
