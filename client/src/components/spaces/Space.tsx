import cx from "classix";

export type SpaceProps = {
  className?: string;
  children?: React.ReactNode;
};

export default function Space({ className, children }: SpaceProps) {
  const classes = cx("flex flex-col h-full w-full", className);
  return <div className={classes}>{children}</div>;
}
