import { useClasses } from "@/utils/classes";

type PreviewBoxProps = {
  title: string;
  className?: string;
  children: React.ReactNode;
};

export default function PreviewBox({ title, className, children }: PreviewBoxProps) {
  const classes = useClasses(["border border-gray-200 rounded w-3/4", className]);

  return (
    <>
      <h1>{title}</h1>
      <div className={classes}>
        <div className="flex h-[460px] p-4">{children}</div>
      </div>
    </>
  );
}
