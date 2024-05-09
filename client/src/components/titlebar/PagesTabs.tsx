import cx from "classix";
import { tertiary } from "@/utils/colors";
import { useUserStore } from "@/stores/UserStore";
import { Page, useAppStore } from "@/stores/AppStore";
import PlusIcon from "@/icons/plus.svg?react";
import CloseIcon from "@/icons/close.svg?react";
import CloseCircleIcon from "@/icons/close-circle.svg?react";

function PagesTabs() {
  const pages = useAppStore((state) => state.pages);
  const activePageId = useAppStore((state) => state.activePageId);
  const setActivePage = useAppStore((state) => state.setActivePage);
  const closePage = useAppStore((state) => state.closePage);

  const handleClosePage = (pageId: string) => {
    closePage(pageId);
  };

  const handleSelectPage = (pageId: string) => {
    setActivePage(pageId);
  };

  // Add a new blank page when the "+" button is clicked
  const handleAddBlankPage = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    useAppStore.getState().addBlankPage();
  };

  const classes = {
    closeButton: cx(
      "flex w-9 h-9 p-1 items-center align-middle rounded hover:bg-blue-600",
      tertiary("background", "hover:background")
    ),
  };

  return (
    <div className="flex flex-row w-full space-x-1">
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
        <button className={classes.closeButton} onClick={handleAddBlankPage}>
          <PlusIcon className={`w-8 h-8 px-1 rounded`} />
        </button>
      )}
      <div className="flex-grow" data-tauri-drag-region />
    </div>
  );
}

type TabProps = {
  page: Page;
  selected: boolean;
  onSelect: (pageId: string) => void;
  onClose: (pageId: string) => void;
};

function Tab({ page, selected, onSelect, onClose }: TabProps) {
  const showFileExtensions = useUserStore((state) => state.settings.showFileExtensions);

  const Icon = page.editor.icon;
  const CloseButtonIcon = page.modified ? CloseCircleIcon : CloseIcon;

  const classes = {
    tab: cx(
      "flex items-center h-9 px-4 rounded w-48",
      "text-xs text-left whitespace-nowrap overflow-hidden overflow-ellipsis",
      selected && "shadow-sm shadow-blue-800 dark:shadow-blue-900",
      selected ? "bg-blue-600 dark:bg-blue-900" : tertiary("background", "hover:background")
    ),
    closeButton: cx("flex ml-auto min-w-fit rounded", selected ? "hover:bg-blue-500" : "hover:bg-blue-700"),
  };

  // Showing the file extension only if the setting is enabled
  const title = showFileExtensions ? page.title : page.title.replace(/\.[^/.]+$/, "");

  return (
    <button
      className={classes.tab}
      onClick={() => {
        onSelect(page.id);
      }}
    >
      <Icon className="w-5 h-5" />
      <span className="mx-2 text-xs font-medium">{title}</span>
      <a href="#" className={classes.closeButton}>
        <CloseButtonIcon
          className={`w-6 h-6 px-1 bg-transparent`}
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
