import cx from "classix";
import { useEffect, useRef, useState } from "react";

type AutoHideProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * A React component that hides its content if there is no enough vertical space to display it.
 */
export default function AutoHide({ children, className }: AutoHideProps) {
  const autoHideRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHidden(entry.contentRect.height < contentRef.current.clientHeight);
        console.log(entry.contentRect.height, contentRef.current.clientHeight);
      }
    });
    observer.observe(autoHideRef.current);
    return () => observer.disconnect();
  }, [hidden]);

  className = cx("overflow-hidden", className);
  return (
    <div ref={autoHideRef} className={className}>
      <div
        ref={contentRef}
        style={{
          visibility: hidden ? "hidden" : "visible",
          position: hidden ? "absolute" : "static",
        }}
      >
        {children}
      </div>
    </div>
  );
}
