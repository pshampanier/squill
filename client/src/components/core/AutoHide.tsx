import cx from "classix";
import { useEffect, useRef, useState } from "react";

type AutoHideProps = {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  children: React.ReactNode;
  className?: string;
};

/**
 * A React component that hides its content if there is no enough vertical space to display it.
 */
export default function AutoHide({ children, onClick, className }: AutoHideProps) {
  const autoHideRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    console.debug("AutoHide", {
      visible,
      parentHeight: autoHideRef.current?.clientHeight,
      contentHeight: contentRef.current?.clientHeight,
    });
    const observer = new ResizeObserver(() => {
      const newVisible = contentRef.current.clientHeight <= autoHideRef.current.clientHeight;
      if (newVisible !== visible) {
        setVisible(newVisible);
      }
    });
    observer.observe(autoHideRef.current);
    return () => observer.disconnect();
  }, [visible]);

  const classes = {
    root: cx("overflow-hidden border border-red-100", className),
    content: cx(visible ? "opacity-100" : "opacity-0", "transition-opacity duration-300 ease-out"),
  };
  return (
    <div ref={autoHideRef} className={className} onClick={onClick}>
      <div ref={contentRef} className={classes.content}>
        {children}
      </div>
    </div>
  );
}
