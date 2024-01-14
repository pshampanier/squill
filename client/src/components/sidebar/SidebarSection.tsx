import { secondary as colors } from "@/utils/colors";
import cx from "classix";
import { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  label: string;
};

const classes = cx("px-2 font-semibold w-full uppercase", colors("heading-text"));

export default function SidebarSection({ children, label }: Props) {
  return (
    <div className="flex flex-col space-y-1 w-full">
      <label className={classes}>{label}</label>
      {children && children}
    </div>
  );
}
