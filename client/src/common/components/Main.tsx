import { useClasses } from "@/utils/classes";
import { ReactNode } from "react";

type MainProps = {
  children?: ReactNode;
  className?: string;
};

export default function Main({ className, children }: MainProps) {
  const classes = useClasses(["flex flex-auto", className]);
  return <main className={classes}>{children}</main>;
}
