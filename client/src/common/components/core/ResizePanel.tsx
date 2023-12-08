const baseClasses = "flex flex-col w-1 border-l border-gray-200 bg-white";
const hoverClasses =
  "hover:bg-blue-500 hover:border-blue-500 hover:cursor-col-resize  hover:transition-colors hover:delay-100";

export default function ResizePanel() {
  return <div className={`${baseClasses} ${hoverClasses} transition-all`}></div>;
}
