import { cx } from "classix";
import { primary as colors } from "@/utils/colors";
import { useState } from "react";

type PreviewBoxProps = {
  className?: string;
  children: React.ReactNode;
};

export default function PreviewBox({ className, children }: PreviewBoxProps) {
  const [mode] = useState<"preview" | "code">("preview");
  const classes = cx("overflow-x-scroll border rounded w-full mt-2 flex flex-col", colors("border"), className);

  children = mode === "preview" ? children : <>{children}</>;

  return (
    <div className={classes}>
      <div className="flex p-4 w-full h-full ">{mode === "preview" && children}</div>
    </div>
  );
}
