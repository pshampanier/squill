import cx from "classix";
import { primary as colors } from "@/utils/colors";

export type SpaceProps = {
  className?: string;
  forwardRef?: React.RefObject<HTMLDivElement>;
  children?: React.ReactNode;
};

export default function Space({ forwardRef, className, children }: SpaceProps) {
  const classes = cx("flex flex-col h-full w-full", colors("background", "text"), className);
  return (
    <div ref={forwardRef} className={classes} tabIndex={0}>
      {children}
    </div>
  );
}
