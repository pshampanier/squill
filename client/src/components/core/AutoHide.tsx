import cx from "classix";
import { useEffect, useRef, useState } from "react";

type AutoHideProps = {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  children: React.ReactNode;
  className?: string;
  variant?: "vertical" | "horizontal";
};

/**
 * A React component that hides its content if there is no enough vertical space to display it.
 */
export default function AutoHide({ children, onClick, variant = "vertical", className }: AutoHideProps) {
  const autoHideRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const parentSize = variant === "vertical" ? autoHideRef.current?.clientHeight : autoHideRef.current?.clientWidth;
      const contentSize = variant === "vertical" ? contentRef.current?.clientHeight : contentRef.current?.clientWidth;
      console.debug("AutoHide", { visible, parentSize, contentSize });
      const newVisible = contentSize <= parentSize;
      if (newVisible !== visible) {
        setVisible(newVisible);
      }
    });
    observer.observe(autoHideRef.current);
    return () => observer.disconnect();
  }, [visible]);

  const classes = {
    root: cx(variant === "vertical" ? "h-full" : "w-full", className),
    content: cx(
      visible ? "opacity-100" : "opacity-0",
      variant === "vertical" ? "h-fit" : "w-fit",
      "transition-opacity duration-300 ease-out",
    ),
  };
  return (
    <div ref={autoHideRef} className={classes.root} onClick={onClick} data-component="AutoHide">
      <div ref={contentRef} className={classes.content}>
        {children}
      </div>
    </div>
  );
}
