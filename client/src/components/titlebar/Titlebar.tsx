import cx from "classix";
import { tertiary as colors } from "@/utils/colors";
import React, { useEffect, useRef } from "react";
import { ColorsContext } from "@/stores/ColorsContext";
import { env } from "@/utils/env";
import { appWindow } from "@tauri-apps/api/window";
import { UnlistenFn } from "@tauri-apps/api/event";
import AppLogoIcon from "@/icons/app-logo.svg?react";

type TitlebarProps = {
  children?: React.ReactNode;
  className?: string;
};

export default function Titlebar({ children, className }: TitlebarProps) {
  // On macOS desktop app, we need to add a padding to the left of the titlebar for the default buttons
  // (open/close/maximize). This padding is removed when the window is in fullscreen mode because the buttons are then
  // hidden. We need to listen to the resize event to detect when the window is in fullscreen mode and because Tauri
  // appWindow.onResize() listener is async we need to use a ref to store the unregister function.
  const [fullscreen, setFullscreen] = React.useState<boolean>(false);
  const unregisterOnResize = useRef<UnlistenFn>(null);
  if (env.applicationType === "desktop" && env.platform === "macos") {
    useEffect(() => {
      appWindow
        .onResized(() => {
          appWindow.isFullscreen().then((isFullscreen) => {
            isFullscreen !== fullscreen && setFullscreen(isFullscreen);
          });
        })
        .then((unregister) => {
          unregisterOnResize.current = unregister;
        });
      return () => {
        // Unregister the listener when the component is unmounted
        unregisterOnResize.current && unregisterOnResize.current();
      };
    }, [fullscreen]);
  }

  const classes = cx(
    "flex flex-none space-x-2 h-11 px-1 justify-between text-white w-full items-center",
    colors("background"),
    // On macOs, add a padding to the left of the titlebar for the default buttons (open/close/maximize)
    env.applicationType === "desktop" && env.platform === "macos" && !fullscreen && "pl-[64px]",
    className,
  );
  return (
    <ColorsContext.Provider value={colors}>
      <header data-tauri-drag-region className={classes}>
        {children}
      </header>
    </ColorsContext.Provider>
  );
}

/**
 * Display the application name in the titlebar.
 */
function AppName({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        "pr-2 space-x-1 flex flex-row text-base h-full items-center pointer-events-none font-comfortaa select-none",
        className,
      )}
    >
      <AppLogoIcon className="w-5 h-5 flex-none hidden" />
      <span className="flex-none font-bold">squill</span>
      <span className="flex-none opacity-70">{env.applicationType === "desktop" ? "desktop" : "cloud"}</span>
    </div>
  );
}

Titlebar.AppName = AppName;
