import { KeyboardShortcut } from "@/utils/types";
import { env } from "@/utils/env";

import Meta from "@/assets/keys/meta.svg?react";
import Alt from "@/assets/keys/alt.svg?react";
import Shift from "@/assets/keys/shift.svg?react";
import Ctrl from "@/assets/keys/ctrl.svg?react";

type KeyboardShortcutProps = {
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

export default function KBD({ shortcut }: KeyboardShortcutProps) {
  const s = !Array.isArray(shortcut) ? shortcut : env.plateform == "macos" ? shortcut[0] : shortcut[1];
  return (
    <span className="flex flex-wrap items-center gap-x-1 h-6 text-sm text-gray-400 dark:text-gray-600">
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
