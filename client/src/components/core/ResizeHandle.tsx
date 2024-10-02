import { useCallback, useEffect, useRef } from "react";

export type ResizeProps = {
  /**
   * The size of the side panel (optional)
   */
  size?: number;

  /**
   * The minimum size of the side panel (optional)
   */
  minSize?: number;

  /**
   * The maximum size of the side panel (optional)
   */
  maxSize?: number;

  /**
   * A callback function called when the size changes.
   */
  onResize?: (event: React.PointerEvent<HTMLDivElement>, size: number) => void;

  /**
   * A callback function called when the resizing ends.
   */
  onResizeEnd?: (event: React.PointerEvent<HTMLDivElement>, size: number) => void;
};

export type ResizeHandleProps = ResizeProps & {
  /**
   * Additional class names to apply to the root element of the component.
   */
  className?: string;

  /**
   * The position of the handle relative to the element it resizes.
   */
  position: "left" | "right";
};

export default function ResizeHandle({
  className,
  size,
  minSize,
  maxSize,
  position,
  onResize,
  onResizeEnd,
}: ResizeHandleProps) {
  const dragging = useRef<boolean>();
  const dragStartAt = useRef<number>();
  const lastResize = useRef<number>();
  const lastClientX = useRef<number>();

  // Every time the size changes, we need to update the dragStartAt value which is the position of the mouse when that
  // size was suggested by calling onResize.
  useEffect(() => {
    dragStartAt.current = lastClientX.current;
  }, [size]);

  const getUpdates = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      let offset: number;
      let resize: number;
      let cursor: string;
      if (position === "left") {
        offset = dragStartAt.current - event.clientX;
      } else {
        offset = event.clientX - dragStartAt.current;
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

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    dragStartAt.current = event.clientX;
    lastResize.current = size;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) {
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

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) {
      dragging.current = false;
      event.currentTarget.style.cursor = "col-resize";
      event.currentTarget.releasePointerCapture(event.pointerId);
      const updates = getUpdates(event);
      console.debug("Resizing", { resize: updates.resize, offset: updates.offset, minSize, maxSize });
      onResizeEnd?.(event, updates.resize);
    }
  };

  return (
    <div
      className={className}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    ></div>
  );
}
