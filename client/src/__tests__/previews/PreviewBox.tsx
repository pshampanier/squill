import { cx } from "classix";
import { primary as colors } from "@/utils/colors";

type PreviewBoxProps = {
  className?: string;
  children: React.ReactNode;
};

export default function PreviewBox({ className, children }: PreviewBoxProps) {
  const classes = cx("overflow-x-scroll border rounded w-full mt-2", colors("border"), className);

  return (
    <div className={classes}>
      <div className="flex p-4 w-full h-full ">{children}</div>
    </div>
  );
}
