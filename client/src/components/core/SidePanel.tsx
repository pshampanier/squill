import cx from "classix";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

type SidePanelProps = {
  className?: string;
  variant: "left" | "right";
  visible: boolean;
  children: ReactNode;
};

/**
 * A side panel that can be shown or hidden with a sliding transition.
 *
 * When a component is not visible (after the transition ends), the component is still rendered but it is not visible
 * using the `invisible` class. This would prevent the component's children from begin able to receive focus.
 */
export default function SidePanel({ className, variant, visible, children }: SidePanelProps) {
  const refPanel = useRef<HTMLDivElement>(null);
  const [visibility, setVisibility] = useState<"visible" | "invisible" | "showing" | "hiding">(
    visible ? "visible" : "invisible",
  );

  const handleOnTransitionStart = useCallback(() => {
    console.log("Transition started", { visibility, visible });
  }, [visible]);

  const handleOnTransitionEnd = useCallback(
    (event: Event) => {
      if (event.target === refPanel.current) {
        // We only care about the transition event on the panel itself, not its children
        console.log("Transition ended", { visibility, visible });
        setVisibility(visible ? "visible" : "invisible");
      }
    },
    [visible],
  );

  useEffect(() => {
    if ((visible === true && visibility === "visible") || (visible === false && visibility === "invisible")) {
      return;
    }
    const panel = refPanel.current;
    if (panel) {
      console.log("Visibility changed", visible);
      setVisibility(visible ? "showing" : "hiding");
      panel.addEventListener("transitionstart", handleOnTransitionStart);
      panel.addEventListener("transitionend", handleOnTransitionEnd);
      return () => {
        panel.removeEventListener("transitionstart", handleOnTransitionStart);
        panel.removeEventListener("transitionend", handleOnTransitionEnd);
      };
    }
  }, [visible]);

  const classes = cx(
    "transition-transform duration-500 transform-gpu",
    (visibility === "showing" || visibility === "visible") && "translate-x-0",
    (visibility === "hiding" || visibility === "invisible") && variant === "left" && "-translate-x-full",
    (visibility === "hiding" || visibility === "invisible") && variant === "right" && "translate-x-full",
    visibility === "invisible" && "invisible",
    className,
  );

  console.log("Rendering SidePanel", { visibility, visible, classes });
  return (
    <aside ref={refPanel} className={classes}>
      {children}
    </aside>
  );
}
