import { ColorScheme } from "@/models/users";
import { useAppStore } from "@/stores/AppStore";
import { useUserStore } from "@/stores/UserStore";
import { calculateColorScheme } from "@/utils/colors";
import { useEffect } from "react";

export default function ApplySystemPreferences(): null {
  const colorSchemeSetting = useUserStore((state) => state.settings?.colorScheme);
  const setColorScheme = useAppStore((state) => state.setColorScheme);

  const applyColorScheme = (colorScheme: ColorScheme): "light" | "dark" => {
    const currentColorScheme = calculateColorScheme(colorScheme);
    document.documentElement.classList.remove(currentColorScheme === "dark" ? "light" : "dark");
    document.documentElement.classList.add(currentColorScheme === "dark" ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", currentColorScheme);
    setColorScheme(currentColorScheme);
    return currentColorScheme;
  };

  useEffect(() => {
    const currentColorScheme = applyColorScheme(colorSchemeSetting);
    if (colorSchemeSetting === "auto" || colorSchemeSetting === undefined) {
      // The current color scheme is based on the user's system preferences, so we need to listen for changes
      // to the user's system preferences and update the color scheme accordingly.
      const mql = window.matchMedia(`(prefers-color-scheme: ${currentColorScheme})`);
      mql.onchange = () => {
        applyColorScheme(colorSchemeSetting);
      };
    }
  }, [colorSchemeSetting]);

  return null;
}
