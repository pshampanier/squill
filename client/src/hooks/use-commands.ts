import { CommandEvent } from "@/utils/commands";
import { RefObject, useEffect } from "react";

type CommandHookProps = {
  /**
   * The reference to the HTML element used to capture the DOM event.
   */
  ref: RefObject<HTMLElement>;

  /**
   * The callback function to call when the command event is triggered.
   */
  onCommand?: (event: CommandEvent) => void;
};

/**
 * Hook that provides the ability to register commands handlers.
 */
export function useCommand({ ref, onCommand }: CommandHookProps) {
  useEffect(() => {
    if (!ref.current) return;

    const handleCommandEvent = (event: CommandEvent) => {
      onCommand?.(event);
      if (event.defaultPrevented) return;
    };

    const htmlElement: HTMLElement = ref.current;
    htmlElement.addEventListener("command", handleCommandEvent);
    return () => {
      htmlElement.removeEventListener("command", handleCommandEvent);
    };
  }, [onCommand]);
}
