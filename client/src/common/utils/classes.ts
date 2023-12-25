type Classes = string | { light: string; dark: string };

function applyTheme(theme: "light" | "dark", classes: string) {
  if (theme === "light" && classes.includes("dark:")) {
    throw new Error("Theme is 'light' but some classes contain 'dark:'");
  } else if (theme === "dark") {
    classes = classes
      .split(" ")
      .map((c) => {
        c = c.trim();
        if (c.startsWith("dark:")) {
          throw new Error("'dark:' should not be included: " + classes);
        } else if (c.length > 0) {
          return "dark:" + c;
        }
      })
      .filter((v) => v != undefined)
      .join(" ");
  }
  return classes;
}

export function useClasses(classes: Classes[]): string {
  return classes
    .map((c) => {
      if (typeof c === "string") {
        return applyTheme("light", c);
      } else if ( c !== undefined) {
        return applyTheme("light", c.light) + " " + applyTheme("dark", c.dark);
      }
    })
    .join(" ");
}
