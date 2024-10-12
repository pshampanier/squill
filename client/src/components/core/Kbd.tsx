import { KeyboardShortcut } from "@/utils/types";
import { getCurrentEnvironmentShortcut } from "@/utils/commands";

import Meta from "@/assets/keys/meta.svg?react";
import Alt from "@/assets/keys/alt.svg?react";
import Shift from "@/assets/keys/shift.svg?react";
import Ctrl from "@/assets/keys/ctrl.svg?react";
import cx from "classix";

type KeyboardShortcutProps = {
  className?: string;
  shortcut: KeyboardShortcut;
  size: "xs" | "sm";
};

function Key({ name, className }: { name: string; className?: string }) {
  switch (name.toUpperCase()) {
    case "META":
      return <Meta className={className} />;
    case "ALT":
      return <Alt className={className} />;
    case "SHIFT":
      return <Shift className={className} />;
    case "CTRL":
      return <Ctrl className={className} />;
    default: {
      return <span className={cx("px-1", className)}>{name}</span>;
    }
  }
}

export default function Kbd({ size = "sm", shortcut, className }: KeyboardShortcutProps) {
  const s = getCurrentEnvironmentShortcut(shortcut);
  const classes = {
    root: cx("inline-flex whitespace-nowrap font-mono items-center text-gray-400 dark:text-gray-300", className),
    kbd: cx(
      "inline-flex justify-center items-center rounded bg-gray-100 dark:bg-gray-700 mx-0.5",
      size === "xs" && "min-w-5 h-5 text-xm",
      size === "sm" && "min-w-6 h-6 text-sm",
    ),
    key: "px-1",
  };
  return (
    <span className={classes.root}>
      {s.split("+").map((key, index) => {
        return (
          <kbd key={index} className={classes.kbd}>
            <Key name={key} />
          </kbd>
        );
      })}
    </span>
  );
}
