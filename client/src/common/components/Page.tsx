import { cx } from "classix";
import { ReactNode } from "react";

type PageProps = {
  children?: ReactNode;
  className?: string;
};

export default function Page({ className, children }: PageProps) {
  const classes = cx("flex flex-col flex-grow flex-1 overflow-hidden h-full p-3 dark:bg-gray-800", className);
  return <div className={classes}>{children}</div>;
}
