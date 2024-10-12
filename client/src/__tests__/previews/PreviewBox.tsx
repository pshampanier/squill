import { cx } from "classix";
import { primary as colors } from "@/utils/colors";
import { useState } from "react";

type PreviewBoxProps = {
  className?: string;
  children: React.ReactNode;
};

export default function PreviewBox({ className, children }: PreviewBoxProps) {
  const [mode] = useState<"preview" | "code">("preview");
  const classes = cx("overflow-hidden border rounded w-full mt-2 flex flex-col", colors("border"), className);

  children = mode === "preview" ? children : <>{children}</>;

  return (
    <div className={classes} data-component="preview-box">
      <div className="flex p-4 w-full h-full flex-col space-y-2">{mode === "preview" && children}</div>
    </div>
  );
}
