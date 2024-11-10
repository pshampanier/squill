import cx from "classix";

type PreviewProps = {
  className?: string;
  children: React.ReactNode;
};

function Preview({ children, className }: PreviewProps) {
  const classes = cx("flex flex-col", className);
  return <div className={classes}>{children}</div>;
}
function PreviewTitle({ children }: PreviewProps) {
  return <h1 className="relative text-md font-bold text-gray-800 dark:text-white">{children}</h1>;
}

function PreviewDescription({ children }: PreviewProps) {
  return <p className="mt-2">{children}</p>;
}

Preview.Title = PreviewTitle;
Preview.Description = PreviewDescription;

export default Preview;
