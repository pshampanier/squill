import { cx } from "classix";
import { ReactNode } from "react";

type MainProps = {
  children?: ReactNode;
  className?: string;
};

export default function Main({ className, children }: MainProps) {
  const classes = cx(
    "flex flex-1 overflow-scroll",
    "min-w-0" /* workaround for the Monaco editor inside a flexbox (https://bit.ly/48ET02p) */,
    "transition-all duration-500" /* used by the sidebar when showing or hiding */,
    className,
  );
  return (
    <main data-component="main" className={classes}>
      {children}
    </main>
  );
}
