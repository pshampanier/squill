import { useCallback, useEffect, useRef } from "react";

export type ResizableProps = {
  /**
   * The position of the handle relative to the element it resizes.
   */
  position: "left" | "right";

  /**
   * The size of the side panel (optional)
   */
  size: number;

  /**
   * The minimum size of the side panel (optional)
   */
  minSize: number;

  /**
   * The maximum size of the side panel (optional)
   */
  maxSize: number;

  /**
   * A callback function called when the size changes.
   */
  onResize?: (event: React.PointerEvent<HTMLDivElement>, size: number) => void;

  /**
   * A callback function called when the resizing ends.
   */
  onResizeEnd?: (event: React.PointerEvent<HTMLDivElement>, size: number) => void;
};

/**
 * A hook that provides the necessary logic to make an element resizable by dragging a handle.
 */
export function useResizable({ size, minSize, maxSize, position, onResize, onResizeEnd }: ResizableProps) {
  // True if the element is currently being resized.
  const resizing = useRef<boolean>();

  // The position of the mouse when the resizing started (or when the size was suggested by calling onResize).
  const resizingStartAt = useRef<number>();

  // The last size that was suggested by calling onResize.
  const lastResize = useRef<number>();

  // The last clientX value of the pointer.
  const lastClientX = useRef<number>();

  // Every time the size changes, we need to update the resizingStartAt value which is the position of the mouse when that
  // size was suggested by calling onResize.
  useEffect(() => {
    resizingStartAt.current = lastClientX.current;
  }, [size]);

  const getUpdates = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      let offset: number;
      let resize: number;
      let cursor: string;
      if (position === "left") {
        offset = resizingStartAt.current - event.clientX;
      } else {
        offset = event.clientX - resizingStartAt.current;
      }
      resize = size + offset;
      if (minSize && resize < minSize) {
        cursor = position === "left" ? "w-resize" : "e-resize";
        resize = minSize;
      } else if (maxSize && resize > maxSize) {
        cursor = position === "left" ? "e-resize" : "w-resize";
        resize = maxSize;
      } else {
        cursor = "col-resize";
      }
      return { offset, resize, cursor };
    },
    [position, size, minSize, maxSize],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    resizing.current = true;
    resizingStartAt.current = event.clientX;
    lastResize.current = size;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (resizing.current) {
      const updates = getUpdates(event);
      event.currentTarget.style.cursor = updates.cursor;
      lastClientX.current = event.clientX;
      if (lastResize.current !== updates.resize) {
        console.debug("Resizing", { size, resize: updates.resize, offset: updates.offset, minSize, maxSize });
        lastResize.current = updates.resize;
        onResize?.(event, updates.resize);
      }
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (resizing.current) {
      resizing.current = false;
      event.currentTarget.style.cursor = "col-resize";
      event.currentTarget.releasePointerCapture(event.pointerId);
      const updates = getUpdates(event);
      console.debug("Resizing", { resize: updates.resize, offset: updates.offset, minSize, maxSize });
      onResizeEnd?.(event, updates.resize);
    }
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
