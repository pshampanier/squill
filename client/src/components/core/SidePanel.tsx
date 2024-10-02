import cx from "classix";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { primary, ColorsFunction } from "@/utils/colors";
import ResizeHandle, { ResizeProps, ResizeHandleProps } from "@/components/core/ResizeHandle";

export type SidePanelProps = ResizeProps & {
  /**
   * Additional class names to apply to the root element of the component.
   */
  className?: string;

  /**
   * The side panel position.
   *
   * Indicates whether the side panel is on the left or right side of the page.
   */
  variant: "left" | "right";

  /**
   * Current visibility state of the side panel.
   */
  visible: boolean;

  /**
   * Whether the side panel is resizable (default is false).
   */
  resizable?: boolean;

  /**
   * The color palette to use for the resize handle (default is `primary`, only used if the side panel is resizable).
   */
  colors?: ColorsFunction;

  /**
   * The children of the side panel.
   */
  children?: ReactNode;
};

/**
 * A side panel that can be shown or hidden with a sliding transition.
 *
 * When the side panel is hidden, it's space is given to the sibling element next to it.
 *
 * When a component is not visible (after the transition ends), the component is still rendered but it is not visible
 * using the `invisible` class. This would prevent the component's children from begin able to receive focus.
 */
export default function SidePanel({
  className,
  variant,
  visible,
  resizable = false,
  size: defaultSize,
  minSize,
  maxSize,
  colors = primary,
  children,
  onResize,
  onResizeEnd,
}: SidePanelProps) {
  const refPanel = useRef<HTMLDivElement>(null);
  const [visibility, setVisibility] = useState<"visible" | "invisible" | "showing" | "hiding">(
    visible ? "visible" : "invisible",
  );

  const [size, setSize] = useState<number | undefined>(defaultSize);

  const handleOnTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLElement>) => {
      if (event.target === refPanel.current) {
        // We only care about the transition event on the panel itself, not its children
        console.debug("SidePanel transition ended", { visibility, visible });
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
      console.debug("SidePanel visibility changed", visible);
      setVisibility(visible ? "showing" : "hiding");

      // To have a transition when hiding the SidePanel we use translate-x-0 which moves the SidePanel is out of view,
      // but the SidePanel still use its space in the document flow, which is why the elements next to the SidePanel are
      // not moving. As a workaround we are also moving the next sibling element of the SidePanel changing their margin
      // property.
      // TODO: Also we need to set the width of the moved sibling element to it's current width (before the translation)
      // otherwise some children element such as the monaco editor will not be resized properly when the SidePanel is
      // coming back.
      let sibling: HTMLElement | null = null;
      if (variant === "left") {
        sibling = findVisibleSibling(refPanel.current, (e) => e.nextElementSibling);
        if (sibling) {
          sibling.style.transition = "margin-left 500ms";
          sibling.style.transitionTimingFunction = "cubic-bezier(0, 0, 0.2, 1)";
          sibling.style.marginLeft = visible ? "0" : `-${refPanel.current.offsetWidth}px`;
        }
      } else if (variant === "right") {
        const sibling = findVisibleSibling(refPanel.current, (e) => e.previousElementSibling);
        if (sibling) {
          sibling.style.transition = "margin-right 500ms";
          sibling.style.transitionTimingFunction = "cubic-bezier(0, 0, 0.2, 1)";
          sibling.style.marginRight = visible ? "0" : `-${refPanel.current.offsetWidth}px`;
        }
      }
    }
  }, [visible]);

  // If the panel is `resizable` and the parent component did not provide any of onResize or onResizeEnd, then the panel
  // will control the resizing by itself by using the `size` state.
  const handleResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, size: number) => {
      if (onResize || onResizeEnd) {
        // We use `onResize` regardless of whether it's provided or not, because if `onResizeEnd` is provided if means
        // that the parent component is controlling the resizing.
        onResize?.(event, size);
      } else {
        setSize(size);
      }
    },
    [onResize, onResizeEnd],
  );

  const classes = cx(
    "relative", // Required for the resize handle to be positioned correctly
    "transition-transform duration-500 transform-gpu ease-out",
    (visibility === "showing" || visibility === "visible") && "translate-x-0",
    (visibility === "hiding" || visibility === "invisible") && variant === "left" && "-translate-x-full",
    (visibility === "hiding" || visibility === "invisible") && variant === "right" && "translate-x-full",
    visibility === "invisible" && "invisible",
    className,
  );

  // The size can be either controlled by `className` or by the `size` prop.
  const styles: React.CSSProperties = {};
  if (size !== undefined) {
    styles.width = `${size}px`;
  }

  // If `resizable` we render a resize handle on the side panel.
  // - The position of the resize handle is the opposite of the side panel variant.
  // - If onResize is provided, the resizing is controlled by the parent component, otherwise the side panel will
  //   apply the resizing by itself
  const ResizeHandle = resizable && (
    <SidePanelResizeHandle
      position={variant === "left" ? "right" : "left"}
      colors={colors}
      minSize={minSize}
      maxSize={maxSize}
      size={size}
      onResize={resizable && (onResize || handleResize)}
      onResizeEnd={onResizeEnd}
    />
  );

  console.debug("Rendering SidePanel", { visibility, visible, classes });
  return (
    <aside ref={refPanel} className={classes} onTransitionEnd={handleOnTransitionEnd} style={styles}>
      {resizable && variant === "left" && ResizeHandle}
      {children}
      {resizable && variant === "right" && ResizeHandle}
    </aside>
  );
}

// Find a visible sibling element next to the given element.
//
// The `iterator` function is used to iterate over either the next or previous sibling elements.
function findVisibleSibling(element: Element, iterator: (e: Element) => Element | null): HTMLElement | null {
  let sibling = iterator(element);
  while (sibling) {
    if (sibling instanceof HTMLElement) {
      const style = window.getComputedStyle(sibling);
      if (style.display !== "none" && style.visibility !== "hidden") {
        return sibling;
      }
    }
    sibling = iterator(sibling);
  }
  return null;
}

type SidePanelResizeHandleProps = {
  colors: ColorsFunction;
} & ResizeHandleProps;

/**
 * A resize handle for the side panel.
 */
function SidePanelResizeHandle({
  colors,
  position,
  size,
  minSize,
  maxSize,
  onResize,
  onResizeEnd,
}: SidePanelResizeHandleProps) {
  const classes = cx(
    "fixed top-0 w-1 h-full z-10",
    position === "right" && "right-0 border-r",
    position === "left" && "left-0 border-l",
    "bg-transparent",
    "hover:bg-blue-500 hover:border-blue-500 hover:cursor-col-resize hover:transition-colors hover:delay-100 transition-all",
    "dark:hover:bg-blue-800 dark:hover:border-blue-800",
    colors("border"),
  );
  return (
    <ResizeHandle
      className={classes}
      position={position}
      size={size}
      minSize={minSize}
      maxSize={maxSize}
      onResize={onResize}
      onResizeEnd={onResizeEnd}
    ></ResizeHandle>
  );
}
