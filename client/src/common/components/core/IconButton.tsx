import Tooltip from "./Tooltip";

type Props = {
  className?: string;
  icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  tooltip?: string;
  onClick: () => void;
};

export function IconButton({ icon, onClick, className, tooltip }: Props) {
  const Icon = icon;
  const buttonJSX = (
    <button
      onClick={onClick}
      className={
        "flex items-center justify-center w-8 h-8 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg toggle-full-view hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-500 dark:bg-gray-800 focus:outline-none dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 " +
        (className ?? "")
      }
    >
      <Icon className="w-5 h-5" />
    </button>
  );

  if (!tooltip) {
    return buttonJSX;
  } else {
    return (
      <Tooltip text={tooltip} position="left" align="end">
        {buttonJSX}
      </Tooltip>
    );
  }
}
