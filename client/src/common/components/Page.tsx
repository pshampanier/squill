import { useClasses } from "@/utils/classes";
import { ReactNode } from "react";

type PageProps = {
  children?: ReactNode;
  className?: string;
};

export default function Page({ className, children }: PageProps) {
  const classes = useClasses(["flex flex-col flex-grow flex-1 overflow-hidden h-full p-3", className]);
  return <div className={classes}>{children}</div>;
}
