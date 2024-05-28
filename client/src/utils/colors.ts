import tailwindColors from "tailwindcss/colors";
import { raise } from "@/utils/telemetry";
import { env } from "@/utils//env";
import { ColorScheme } from "@/models/users";
/*
 * IMPORTANT: this application is partially using dynamic classnames, in order to force tailwinds to generate the
 * classes that are used by the ColorPreview component, for each text or border color, we need to add the counterpart
 * background color into the safelist of the tailwind.config.js file.
 */

export function colors<T extends string>(colors: Record<T, string>, ...names: T[]): string {
  if (names.length === 1) return colors[names[0]];
  return names.map((c) => colors[c]).join(" ");
}

/**
 * Convert a short hex color to a full hex color (ex: #faf -> #ffaaff).
 *
 * @param color the color to be converted (ex: #fff, #000, white, #ffffff)
 * @returns the given color in full hex format if the given color is a short hex color, otherwise the given color.
 */
export function convertShortToFullcolor(color: string): string {
  if (color.length === 4 && color[0] === "#") {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  } else {
    return color;
  }
}

/**
 * Get the tailwind color value.
 *
 * @param colors the color palette (PRIMARY_COLORS, SECONDARY_COLORS, etc.)
 * @param name the name of the color in the palette (ex: "background")
 * @param colorScheme the color scheme (ex: "light")
 * @returns the tailwind color value (ex: "#111827")
 */
export function rgbColor<T extends string>(colors: Record<T, string>, name: T, colorScheme: "light" | "dark"): string {
  // get the tailwind classes for given color name (ex: background -> "bg-white dark:bg-gray-800")
  const tailwindClasses = colors[name].split(" ");
  // get the tailwind color for given color scheme (ex: dark -> "dark:bg-gray-800")
  const tailwindClass = tailwindClasses[colorScheme === "light" ? 0 : 1];
  // get the tailwind color name (ex: "gray-800")
  const tailwindColorName = tailwindClass.slice(tailwindClass.indexOf("-") + 1);

  const fragment = tailwindColorName.split("-");
  const colorFamily = fragment[0] as keyof typeof tailwindColors;
  if (colorFamily in tailwindColors) {
    const color = tailwindColors[colorFamily];
    if (fragment.length === 1 && typeof color === "string") {
      return convertShortToFullcolor(color);
    } else if (fragment.length === 2 && typeof color === "object") {
      const colorShade = fragment[1] as keyof typeof color;
      const finalColor = color[colorShade];
      if (finalColor) return convertShortToFullcolor(finalColor);
    }
  }
  raise(`'${tailwindColorName}' is not a valid tailwind color name (from '${name}: ${colors[name]}')`);
}

/**
 * Calculate the color scheme of the application based on the given preference.
 *
 * @param colorScheme the color scheme preference.
 * @returns the given color scheme if it is not "auto", otherwise the system preference.
 */
export function calculateColorScheme(colorScheme: ColorScheme): "light" | "dark" {
  if (colorScheme === "auto" || colorScheme === undefined) {
    return env.colorScheme;
  }
  return colorScheme;
}

/**
 * Primary colors
 *
 * These colors are used for the default colors of the application.
 */
export const COLOR_NAMES = [
  "background",
  "hover:background",
  "selected:background",
  "text",
  "hover:text",
  "selected:text",
  "border",
  "hover:border",
  "heading-text",
  "hover:ghost-background",
  "hover:ghost-text",
  "selected:ghost-background",
  "divide",
  "message:background",
  "info:background",
  "success:background",
  "warning:background",
  "danger:background",
  "message:border",
  "info:border",
  "success:border",
  "warning:border",
  "danger:border",
  "message:text",
  "info:text",
  "success:text",
  "warning:text",
  "danger:text",
] as const;

export type Colors = (typeof COLOR_NAMES)[number];
export type ColorsFunction = (...names: Colors[]) => string;

export const PRIMARY_COLORS: Record<Colors, string> = {
  background: "bg-white dark:bg-gray-800",
  "hover:background": "hover:bg-blue-700 dark:hover:bg-blue-600",
  "selected:background": "bg-blue-600 dark:bg-blue-500",
  text: "text-gray-600 dark:text-gray-100",
  "hover:text": "hover:text-white dark:hover:text-white",
  "selected:text": "text-white dark:text-gray-200",
  border: "border-gray-200 dark:border-gray-700",
  "hover:border": "hover:border-blue-700 dark:hover:border-blue-600",
  "heading-text": "text-gray-800 dark:text-white",
  "hover:ghost-background": "hover:bg-gray-100 hover:dark:bg-gray-700",
  "hover:ghost-text": "text-gray-600 dark:text-gray-100",
  "selected:ghost-background": undefined, // FIXME: this is not yet used
  divide: "divide-gray-200 dark:divide-gray-700",
  "message:background": "bg-gray-50 dark:bg-white/[.05]",
  "info:background": "bg-blue-100 dark:bg-blue-800/10",
  "success:background": "bg-teal-100 dark:bg-teal-800/10",
  "warning:background": "bg-yellow-100 dark:bg-yellow-800/10",
  "danger:background": "bg-red-100 dark:bg-red-800/10",
  "message:border": "border-gray-200 dark:border-white/10",
  "info:border": "border-blue-200 dark:border-blue-900",
  "success:border": "border-teal-200 dark:border-teal-900",
  "warning:border": "border-yellow-200 dark:border-yellow-900",
  "danger:border": "border-red-200 dark:border-red-900",
  "message:text": "text-gray-600 dark:text-gray-400",
  "info:text": "text-blue-800 dark:text-blue-500",
  "success:text": "text-teal-800 dark:text-teal-500",
  "warning:text": "text-yellow-800 dark:text-yellow-500",
  "danger:text": "text-red-800 dark:text-red-500",
};

export function primary(...names: Colors[]): string {
  return colors(PRIMARY_COLORS, ...names);
}

export const SECONDARY_COLORS: Record<Colors, string> = {
  background: "bg-gray-50 dark:bg-gray-700",
  "hover:background": primary("hover:background"),
  "selected:background": primary("selected:background"),
  text: "text-gray-600 dark:text-gray-300",
  "hover:text": primary("hover:text"),
  "selected:text": primary("selected:text"),
  border: "border-gray-200 dark:border-gray-600",
  "hover:border": primary("hover:border"),
  "heading-text": primary("heading-text"),
  "hover:ghost-background": "hover:bg-gray-200 dark:hover:bg-gray-600",
  "hover:ghost-text": "text-gray-600 dark:text-gray-300",
  "selected:ghost-background": "bg-gray-100 dark:bg-gray-800",
  divide: "divide-gray-300 dark:divide-gray-600",
  "message:background": primary("message:background"),
  "info:background": primary("info:background"),
  "success:background": primary("success:background"),
  "warning:background": primary("warning:background"),
  "danger:background": primary("danger:background"),
  "message:border": primary("message:border"),
  "info:border": primary("info:border"),
  "success:border": primary("success:border"),
  "warning:border": primary("warning:border"),
  "danger:border": primary("danger:border"),
  "message:text": primary("message:text"),
  "info:text": primary("info:text"),
  "success:text": primary("success:text"),
  "warning:text": primary("warning:text"),
  "danger:text": primary("danger:text"),
};

export function secondary(...names: Colors[]): string {
  return colors(SECONDARY_COLORS, ...names);
}

/**
 * Tertiary colors.
 *
 * Used by the titlebar.
 */
export const TERTIARY_COLORS: Record<Colors, string> = {
  background: "bg-blue-500 dark:bg-blue-800",
  "hover:background": primary("hover:background"),
  "selected:background": primary("selected:background"),
  text: "text-white dark:text-white",
  "hover:text": primary("hover:text"),
  "selected:text": "text-white dark:text-gray-200",
  border: "border-blue-600 dark:border-blue-500",
  "hover:border": primary("hover:border"),
  "heading-text": primary("heading-text"),
  "hover:ghost-background": "hover:bg-blue-700 dark:hover:bg-blue-700",
  "hover:ghost-text": "text-white dark:text-white",
  "selected:ghost-background": undefined, // FIXME: this is not yet used
  divide: "divide-blue-600 dark:divide-blue-500",
  "message:background": primary("message:background"),
  "info:background": primary("info:background"),
  "success:background": primary("success:background"),
  "warning:background": primary("warning:background"),
  "danger:background": primary("danger:background"),
  "message:border": primary("message:border"),
  "info:border": primary("info:border"),
  "success:border": primary("success:border"),
  "warning:border": primary("warning:border"),
  "danger:border": primary("danger:border"),
  "message:text": primary("message:text"),
  "info:text": primary("info:text"),
  "success:text": primary("success:text"),
  "warning:text": primary("warning:text"),
  "danger:text": primary("danger:text"),
};

export function tertiary(...names: Colors[]): string {
  return colors(TERTIARY_COLORS, ...names);
}

/**
 * Syntax highlighting colors
 *
 * These colors are used for the syntax highlighting of the code editor (Monaco) and the syntax highlighting in the
 * <Code> component.
 *
 * Color names are based on the Visual Studio Code syntax highlighting token types and default values are based on the
 * default Visual Studio Code theme 'vs' and 'vs-dark'.
 *
 * @see https://code.visualstudio.com/api/references/theme-color#editor-colors
 * @see https://github.com/microsoft/vscode/blob/main/src/vs/editor/standalone/common/themes.ts
 */
const SYNTAX_HIGHLIGHTING_COLORS = [
  "variable",
  "variable.parameter",
  "constant",
  "comment",
  "number",
  "regexp",
  "annotation",
  "type",
  "delimiter",
  "delimiter.html",
  "tag",
  "tag.id.jade",
  "tag.class.jade",
  "meta",
  "meta.tag",
  "metatag",
  "metatag.content.html",
  "metatag.html",
  "metatag.xml",
  "metatag.php",
  "key",
  "string.key",
  "string.value",
  "attribute.name",
  "attribute.value",
  "string",
  "string.sql",
  "keyword",
  "keyword.flow",
  "operator.sql",
  "operator.swift",
  "predefined.sql",
];

export type SyntaxHighlightingColor = (typeof SYNTAX_HIGHLIGHTING_COLORS)[number];

/**
 * Syntax highlighting theme.
 *
 * @see {@link SYNTAX_HIGHLIGHTING_COLORS}
 */
type SyntaxHighlightingTheme = {
  background: string;
  foreground: string;
  tokenColors: Record<SyntaxHighlightingColor, string>;
};

/**
 * Get the colors associated with the syntax highlighting of the given theme.
 */
export function getSyntaxHighlightingTheme(colorScheme: "light" | "dark"): SyntaxHighlightingTheme {
  switch (colorScheme) {
    case "light": {
      return {
        background: rgbColor(PRIMARY_COLORS, "background", "light"),
        foreground: rgbColor(PRIMARY_COLORS, "text", "light"),
        tokenColors: {
          variable: "#001188",
          "variable.predefined": "#4864aa",
          constant: "#dd0000",
          comment: "#008000",
          number: "#09885a",
          "number.hex": "#3030c0",
          regexp: "#800000",
          annotation: "#808080",
          type: "#008080",
          delimiter: "#000000",
          "delimiter.html": "#383838",
          "delimiter.xml": "#0000ff",
          tag: "#800000",
          "tag.id.jade": "#4f76ac",
          "tag.class.jade": "#4f76ac",
          "meta.scss": "#800000",
          metatag: "#e00000",
          "metatag.content.html": "#ff0000",
          "metatag.html": "#808080",
          "metatag.xml": "#808080",
          key: "#863b00",
          "string.key.json": "#a31515",
          "string.value.json": "#0451a5",
          "attribute.name": "#ff0000",
          "attribute.value": "#0451a5",
          "attribute.value.number": "#09885a",
          "attribute.value.unit": "#09885a",
          "attribute.value.html": "#0000ff",
          "attribute.value.xml": "#0000ff",
          string: "#a31515",
          "string.html": "#0000ff",
          "string.sql": "#ff0000",
          "string.yaml": "#0451a5",
          keyword: "#5b79e3",
          "keyword.json": "#0451a5",
          "keyword.flow": "#af00db",
          "keyword.flow.scss": "#0000ff",
          "operator.scss": "#666666",
          "operator.sql": "#778899",
          "operator.swift": "#666666",
          "predefined.sql": "#aa759f",
        },
      };
    }

    case "dark": {
      return {
        background: rgbColor(PRIMARY_COLORS, "background", "dark"),
        foreground: rgbColor(PRIMARY_COLORS, "text", "dark"),
        tokenColors: {
          variable: "#74b0df",
          "variable.predefined": "#4864aa",
          "variable.parameter": "#9cdcfe",
          constant: "#aa759f",
          comment: "#608b4e",
          number: "#b5cea8",
          "number.hex": "#5bb498",
          regexp: "#b46695",
          annotation: "#cc6666",
          type: "#3dc9b0",
          delimiter: "#dcdcdc",
          "delimiter.html": "#808080",
          "delimiter.xml": "#808080",
          tag: "#569cd6",
          "tag.id.jade": "#4f76ac",
          "tag.class.jade": "#4f76ac",
          "meta.scss": "#a79873",
          "meta.tag": "#ce9178",
          metatag: "#dd6a6f",
          "metatag.content.html": "#9cdcfe",
          "metatag.html": "#569cd6",
          "metatag.xml": "#569cd6",
          key: "#9cdcfe",
          "string.key.json": "#9cdcfe",
          "string.value.json": "#ce9178",
          "attribute.name": "#9cdcfe",
          "attribute.value": "#ce9178",
          "attribute.value.number.css": "#b5cea8",
          "attribute.value.unit.css": "#b5cea8",
          "attribute.value.hex.css": "#d4d4d4",
          string: "#a31515",
          "string.sql": "#a5d6ff",
          keyword: "#569cd6",
          "keyword.flow": "#c586c0",
          "keyword.json": "#ce9178",
          "keyword.flow.scss": "#569cd6",
          "operator.scss": "#909090",
          "operator.sql": "#778899",
          "operator.swift": "#909090",
          "predefined.sql": "#aa759f",
        },
      };
    }
  }
}
