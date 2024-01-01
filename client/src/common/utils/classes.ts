type Modifier = "light" | "dark";

type Classes = string | { [key in Modifier]?: string };

function applyModifier(classes: string, modifier?: Modifier) {
  if (modifier && classes.includes(modifier + ":")) {
    throw new Error(`Modifier '${modifier}:' should not be included: '${classes}`);
  } else if (modifier === "light" && classes.includes("dark:")) {
    throw new Error(`Modifier is '${modifier}:' but some classes contain 'dark:'`);
  } else {
    classes = classes
      .split(" ")
      .map((c) => {
        if (c.length > 0) {
          return modifier && modifier !== "light" ? modifier + ":" + c : c;
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
        return applyModifier(c);
      } else if (typeof c === "object" && c !== null && !Array.isArray(c)) {
        return Object.entries(c)
          .map(([modifier, classes]) => {
            return applyModifier(classes, modifier as Modifier);
          })
          .join(" ");
      }
    })
    .join(" ");
}
