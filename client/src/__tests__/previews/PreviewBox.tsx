import { useClasses } from "@/utils/classes";

type PreviewBoxProps = {
  className?: string;
  children: React.ReactNode;
};

export default function PreviewBox({ className, children }: PreviewBoxProps) {
  const classes = useClasses(["border border-gray-200 rounded w-full mt-2", className]);

  return (
    <div className={classes}>
      <div className="flex p-4 w-full h-full">{children}</div>
    </div>
  );
}
