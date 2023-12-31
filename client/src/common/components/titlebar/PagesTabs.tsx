import { WorkspacePage, useWorkspaceStore } from "@/stores/WorkspaceStore";

import PlusIcon from "@/icons/plus.svg?react";
import CloseIcon from "@/icons/close.svg?react";
import CloseCircleIcon from "@/icons/close-circle.svg?react";

function PagesTabs() {
  const pages = useWorkspaceStore((state) => state.pages);
  const activePageId = useWorkspaceStore((state) => state.activePageId);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const closePage = useWorkspaceStore((state) => state.closePage);
  const plusButtonColor = "hover:bg-blue-600 focus:bg-blue-700";

  const handleClosePage = (pageId: string) => {
    closePage(pageId);
  };

  const handleSelectPage = (pageId: string) => {
    setActivePage(pageId);
  };

  return (
    <div className="flex flex-row space-x-1 non-draggable">
      {pages.map((page) => {
        return (
          <Tab
            key={`tab-${page.id}`}
            page={page}
            selected={page.id === activePageId}
            onSelect={handleSelectPage}
            onClose={handleClosePage}
          />
        );
      })}
      {pages.length > 0 && (
        <button className={`w-9 h-9 p-1 items-center align-middle rounded-sm ${plusButtonColor}`}>
          <PlusIcon className={`w-8 h-8 px-1 rounded-sm`} />
        </button>
      )}
      <div className="flex-grow draggable" />
    </div>
  );
}

type TabProps = {
  page: WorkspacePage;
  selected: boolean;
  onSelect: (pageId: string) => void;
  onClose: (pageId: string) => void;
};

function Tab({ page, selected, onSelect, onClose }: TabProps) {
  const Icon = page.editor.icon;
  const CloseButtonIcon = page.modified ? CloseCircleIcon : CloseIcon;
  const backgroundColor = selected
    ? "bg-blue-400 dark:bg-gray-800 shadow-sm shadow-blue-700"
    : "hover:bg-blue-600 focus:bg-blue-700";
  const iconBackgroundColor = selected ? "hover:bg-blue-500" : "hover:bg-blue-700";
  const text = "text-xs text-left whitespace-nowrap overflow-hidden overflow-ellipsis";

  return (
    <button
      className={`flex items-center h-9 px-4 rounded-sm w-48 ${text} ${backgroundColor}`}
      onClick={() => {
        onSelect(page.id);
      }}
    >
      <Icon className="w-5 h-5" />
      <span className="mx-2 text-xs font-medium">{page.title}</span>
      <a href="#" className="flex ml-auto min-w-fit">
        <CloseButtonIcon
          className={`w-5 h-5 px-1 rounded-sm ${iconBackgroundColor}`}
          onClick={(event) => {
            event.stopPropagation();
            onClose(page.id);
          }}
        />
      </a>
    </button>
  );
}

PagesTabs.Tab = Tab;

export default PagesTabs;
