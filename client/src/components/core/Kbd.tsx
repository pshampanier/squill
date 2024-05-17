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
      return <span className="px-1">{name}</span>;
    }
  }
}

export default function Kbd({ shortcut, className }: KeyboardShortcutProps) {
  const s = getCurrentEnvironmentShortcut(shortcut);
  const classes = cx(
    "inline-flex inline whitespace-nowrap items-center h-6 gap-x-0.5 text-sm text-gray-400 dark:text-gray-300",
    className
  );
  return (
    <span className={classes}>
      {s.split("+").map((key, index) => {
        return (
          <kbd
            key={index}
            className="inline-flex justify-center items-center font-mono text-xs min-w-5 h-5 rounded bg-gray-100 dark:bg-gray-700"
          >
            <Key name={key} />
          </kbd>
        );
      })}
    </span>
  );
}
