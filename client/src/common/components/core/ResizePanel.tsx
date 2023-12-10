import { useState } from "react";

const baseClasses = "flex flex-col w-1 border-l border-gray-200 bg-white";
const hoverClasses =
  "hover:bg-blue-500 hover:border-blue-500 hover:cursor-col-resize  hover:transition-colors hover:delay-100";

type ResizePanelProps = {
  width: number;
  minWidth?: number;
  maxWidth?: number;
  onResize: (width: number) => void;
};

export default function ResizePanel({ width, minWidth, maxWidth, onResize }: ResizePanelProps) {
  const [dragging, setDragging] = useState(false);
  const [dragStartAt, setDragStartAt] = useState(0);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    setDragging(true);
    setDragStartAt(event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const dragAmount = event.clientX - dragStartAt;
    if (minWidth && width + dragAmount < minWidth) {
      event.currentTarget.style.cursor = "e-resize";
    } else if (maxWidth && width + dragAmount > maxWidth) {
      event.currentTarget.style.cursor = "w-resize";
    } else {
      event.currentTarget.style.cursor = "col-resize";
      onResize(width + dragAmount);
      setDragStartAt(event.clientX); // reset drag start for the next move
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div
      className={`${baseClasses} ${hoverClasses} transition-all`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    ></div>
  );
}
