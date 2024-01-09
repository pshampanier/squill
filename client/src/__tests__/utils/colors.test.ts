import { test, expect } from "vitest";
import { rgbColor, PRIMARY_COLORS, convertShortToFullcolor, primary, secondary } from "@/utils/colors";

test("rgbColor", () => {
  const c = rgbColor(PRIMARY_COLORS, "background", "dark");
  expect(c).toBe("#1f2937");
});

test("convertShortToFullcolor", () => {
  expect(convertShortToFullcolor("#faf")).toBe("#ffaaff");
  expect(convertShortToFullcolor("#fff")).toBe("#ffffff");
  expect(convertShortToFullcolor("white")).toBe("white");
});

test("rgbColor", () => {
  expect(rgbColor(PRIMARY_COLORS, "background", "dark")).toBe("#1f2937");
  expect(rgbColor(PRIMARY_COLORS, "background", "light")).toBe("#ffffff");

  expect(() =>
    rgbColor(
      {
        background: "bg-invalid dark:bg-invalid",
      },
      "background",
      "dark"
    )
  ).toThrow(/'invalid' is not a valid tailwind color name \(from 'background: bg-invalid dark:bg-invalid'\)/);
  expect(() =>
    rgbColor(
      {
        background: "bg-invalid-800 dark:bg-invalid-800",
      },
      "background",
      "dark"
    )
  ).toThrow(
    /'invalid-800' is not a valid tailwind color name \(from 'background: bg-invalid-800 dark:bg-invalid-800'\)/
  );
  expect(() =>
    rgbColor(
      {
        background: "bg-gray-120 dark:bg-gray-120",
      },
      "background",
      "dark"
    )
  ).toThrow(/'gray-120' is not a valid tailwind color name \(from 'background: bg-gray-120 dark:bg-gray-120'\)/);
});

test("primary", () => {
  expect(primary("background")).toBe("bg-white dark:bg-gray-800");
  expect(primary("text")).toBe("text-gray-600 dark:text-gray-100");
  expect(primary("background", "text")).toBe("bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-100");
});

test("secondary", () => {
  expect(secondary("background")).toBe("bg-gray-100 dark:bg-gray-700");
  expect(secondary("text")).toBe("text-gray-600 dark:text-gray-300");
  expect(secondary("background", "text")).toBe("bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300");
});
