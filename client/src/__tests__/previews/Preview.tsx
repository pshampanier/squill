type PreviewProps = {
  children: React.ReactNode;
};

function Preview({ children }: PreviewProps) {
  return <div className="flex flex-col ">{children}</div>;
}
function PreviewTitle({ children }: PreviewProps) {
  return <h1 className="relative text-md font-bold text-gray-800 dark:text-white">{children}</h1>;
}

function PreviewDescription({ children }: PreviewProps) {
  return <p className="mt-1">{children}</p>;
}

Preview.Title = PreviewTitle;
Preview.Description = PreviewDescription;

export default Preview;
