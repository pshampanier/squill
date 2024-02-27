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
};

function Key({ name }: { name: string }) {
  switch (name.toUpperCase()) {
    case "META":
      return <Meta />;
    case "ALT":
      return <Alt />;
    case "SHIFT":
      return <Shift />;
    case "CTRL":
      return <Ctrl />;
    default: {
      return <span>{name}</span>;
    }
  }
}

export default function Kbd({ shortcut, className }: KeyboardShortcutProps) {
  const s = getCurrentEnvironmentShortcut(shortcut);
  const classes = cx(
    "flex whitespace-nowrap items-center gap-x-1 h-6 text-sm text-gray-400 dark:text-gray-600",
    className
  );
  return (
    <span className={classes}>
      {s.split("+").map((key, index) => {
        return (
          <kbd key={index} className="inline-flex justify-center items-center font-mono text-xs rounded-md">
            <Key name={key} />
          </kbd>
        );
      })}
    </span>
  );
}
