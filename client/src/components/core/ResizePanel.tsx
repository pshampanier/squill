import { cx } from "classix";
import { secondary as colors } from "@/utils/colors";
import { useState } from "react";

type ResizePanelProps = {
  width: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  onResize?: (width: number) => void;
  onResizeEnd?: (width: number) => void;
};

export default function ResizePanel({ width, minWidth, maxWidth, className, onResize, onResizeEnd }: ResizePanelProps) {
  const [dragging, setDragging] = useState(false);
  const [dragStartAt, setDragStartAt] = useState(0);

  const calculateWidth = (event: React.PointerEvent<HTMLDivElement>) => {
    return width + event.clientX - dragStartAt;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    setDragStartAt(event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !onResize) return;
    const width = calculateWidth(event);
    if (minWidth && width < minWidth) {
      event.currentTarget.style.cursor = "e-resize";
      onResize(minWidth);
    } else if (maxWidth && width > maxWidth) {
      event.currentTarget.style.cursor = "w-resize";
      onResize(maxWidth);
    } else {
      event.currentTarget.style.cursor = "col-resize";
      onResize(width);
      setDragStartAt(event.clientX); // reset drag start for the next move
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (onResizeEnd) {
      onResizeEnd(Math.max(minWidth, Math.min(maxWidth, calculateWidth(event))));
    }
  };

  const classes = cx(
    "flex flex-none w-1 border-r bg-transparent",
    colors("border"),
    "hover:bg-blue-500 hover:border-blue-500 hover:cursor-col-resize hover:transition-colors hover:delay-100 transition-all",
    "dark:hover:bg-blue-800 dark:hover:border-blue-800",
    className,
  );

  return (
    <div
      className={classes}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    ></div>
  );
}
