import cx from "classix";
import { tertiary as colors } from "@/utils/colors";
import React, { useEffect, useRef } from "react";
import { ColorsContext } from "@/stores/ColorsContext";
import { env } from "@/utils/env";
import { appWindow } from "@tauri-apps/api/window";
import { UnlistenFn } from "@tauri-apps/api/event";

type TitlebarProps = {
  children?: React.ReactNode;
};

export default function Titlebar({ children }: TitlebarProps) {
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
    "flex space-x-2 h-11 p-1 justify-between text-white w-full",
    colors("background"),
    // On macOs, add a padding to the left of the titlebar for the default buttons (open/close/maximize)
    env.applicationType === "desktop" && env.platform === "macos" && !fullscreen && "pl-[64px]"
  );
  return (
    <ColorsContext.Provider value={colors}>
      <header data-tauri-drag-region className={classes}>
        {children}
      </header>
    </ColorsContext.Provider>
  );
}
