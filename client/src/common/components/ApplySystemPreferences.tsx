import { ColorScheme, UserSettings } from "@/resources/user/user-settings";
import { useUserStore } from "@/stores/UserStore";
import { useEffect } from "react";

export default function ApplySystemPreferences(): null {
  const colorSchemeSetting = useUserStore((state) => state.settings?.colorScheme);
  const setColorScheme = useUserStore((state) => state.setColorScheme);

  const applyColorScheme = (colorScheme: ColorScheme): "light" | "dark" => {
    const currentColorScheme = UserSettings.calculateColorScheme(colorScheme);
    document.documentElement.classList.remove(currentColorScheme === "dark" ? "light" : "dark");
    document.documentElement.classList.add(currentColorScheme === "dark" ? "dark" : "light");
    setColorScheme(currentColorScheme);
    return currentColorScheme;
  };

  useEffect(() => {
    if (colorSchemeSetting === "auto") {
      // The current color scheme is based on the user's system preferences, so we need to listen for changes
      // to the user's system preferences and update the color scheme accordingly.
      const currentColorScheme = applyColorScheme(colorSchemeSetting);
      const mql = window.matchMedia(`(prefers-color-scheme: ${currentColorScheme})`);
      mql.onchange = () => {
        applyColorScheme(colorSchemeSetting);
      };
    }
  }, [colorSchemeSetting]);

  return null;
}
