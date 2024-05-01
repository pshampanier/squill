import { primary as colors } from "@/utils/colors";
import { useEffect, useRef, useState } from "react";
import { twMerge as tw } from "tailwind-merge";

type LoadingOverlayPosition = "fixed" | "absolute";

type LoadingOverlayProps = {
  delay?: number;
  children?: React.ReactNode;
  position: LoadingOverlayPosition;
  className?: string;
};

export default function LoadingOverlay({ delay, children, position = "fixed", className }: LoadingOverlayProps) {
  // A state to keep track of the visibility of the overlay
  const [visible, setVisible] = useState<boolean>(!delay);
  const overlayRef = useRef<HTMLDivElement>(null);

  // The overlay is visible after 1 second
  useEffect(() => {
    overlayRef.current?.focus();
    const interval = delay
      ? setTimeout(() => {
          setVisible(true);
        }, delay)
      : null;
    return () => {
      interval && clearInterval(interval);
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") {
      setVisible(true);
      event.stopPropagation();
      event.preventDefault();
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setVisible(true);
    event.stopPropagation();
    event.preventDefault();
  };

  const classes = tw(
    colors("text"),
    !visible && "bg-white/50 dark:bg-gray-800/50",
    visible && "bg-white/90 dark:bg-gray-800/90",
    "z-50 flex flex-col items-center justify-center space-y-4",
    "outline-none focus:ring-0 focus:outline-none",
    "select-none",
    "transition-color duration-300",
    position === "fixed" && "fixed inset-0",
    position === "absolute" && "absolute top-0 left-0 w-full h-full",
    className
  );
  return (
    <div ref={overlayRef} className={classes} onClick={handleClick} onKeyDown={handleKeyDown} tabIndex={-1}>
      {visible && children}
    </div>
  );
}
