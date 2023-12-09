import PlusIcon from "@/icons/plus.svg?react";
import CloseIcon from "@/icons/close.svg?react";
import CloseCircleIcon from "@/icons/close-circle.svg?react";

type PagesTabsProps = {
  children?: React.ReactNode;
};

function PagesTabs({ children }: PagesTabsProps) {
  const plusButtonColor = "hover:bg-blue-600 focus:bg-blue-700";
  return (
    <div className="flex flex-row ml-64 non-draggable">
      <div className="flex flex-row">{children}</div>
      <button className={`flex w-9 h-9 p-1 items-center align-middle rounded-sm ${plusButtonColor}`}>
        <PlusIcon className={`w-8 h-8 px-1 rounded-sm`} />
      </button>
    </div>
  );
}

type TabProps = {
  icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  label: string;
  selected?: boolean;
  modified?: boolean;
};

function Tab({ icon, label, selected, modified }: TabProps) {
  const Icon = icon;
  const CloseButtonIcon = modified ? CloseCircleIcon : CloseIcon;
  const backgroundColor = selected ? "bg-blue-400 dark:bg-gray-800 shadow-md shadow-blue-700" : "hover:bg-blue-600";
  const iconBackgroundColor = selected ? "hover:bg-blue-500" : "hover:bg-blue-700";
  const text = "text-xs text-left whitespace-nowrap overflow-hidden overflow-ellipsis";
  return (
    <button className={`flex items-center h-9 px-4 mr-1 rounded-sm w-48 ${text} ${backgroundColor}`}>
      <Icon className="w-5 h-5 stroke-white fill-transparent" />
      <span className="mx-2 text-xs font-medium">{label}</span>
      <button className="flex ml-auto">
        <CloseButtonIcon className={`w-5 h-5 px-1 rounded-sm ${iconBackgroundColor}`} />
      </button>
    </button>
  );
}

PagesTabs.Tab = Tab;

export default PagesTabs;
