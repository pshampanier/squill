import { useAppStore } from "@/stores/AppStore";
import { cx } from "classix";
import { ReactNode } from "react";
import { primary as colors } from "@/utils/colors";

type PageProps = {
  pageId: string;
  children?: ReactNode;
  className?: string;
};

export default function Page({ className, pageId, children }: PageProps) {
  const activePageId = useAppStore((state) => state.activePageId);
  const classes = cx(
    "flex flex-col flex-grow flex-1 overflow-hidden h-full",
    colors("background", "text"),
    activePageId !== pageId && "hidden",
    className,
  );
  return (
    <div className={classes} data-component="page">
      {children}
    </div>
  );
}
