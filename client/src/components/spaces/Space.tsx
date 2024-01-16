import cx from "classix";
import { primary as colors } from "@/utils/colors";

export type SpaceProps = {
  className?: string;
  children?: React.ReactNode;
};

export default function Space({ className, children }: SpaceProps) {
  const classes = cx("flex flex-col h-full w-full", colors("background", "text"), className);
  return <div className={classes}>{children}</div>;
}
