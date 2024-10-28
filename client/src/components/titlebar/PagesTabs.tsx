import cx from "classix";
import { tertiary } from "@/utils/colors";
import { useUserStore } from "@/stores/UserStore";
import { useAppStore } from "@/stores/AppStore";
import PlusIcon from "@/icons/plus.svg?react";
import CloseIcon from "@/icons/close.svg?react";
import CloseCircleIcon from "@/icons/close-circle.svg?react";
import { useCallback, useEffect, useRef } from "react";
import { BLANK_PAGE_ITEM_ID } from "@/utils/constants";

function PagesTabs() {
  const pages = useAppStore((state) => state.pages);
  const addPage = useAppStore((state) => state.addPage);

  // Add a new blank page when the "+" button is clicked
  const handleAddBlankPage = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    addPage(BLANK_PAGE_ITEM_ID);
  };

  const classes = {
    addButton: cx("flex w-9 h-9 p-1 items-center align-middle rounded", tertiary("background", "hover:background")),
  };

  return (
    <>
      <div className="flex flex-row space-x-1 no-scrollbar overflow-x-auto overflow-y-visible h-10 items-center">
        {pages.map((page) => {
          return <Tab key={`tab-${page.id}`} pageId={page.id} />;
        })}
      </div>
      {pages.length > 0 && (
        <button className={classes.addButton} onClick={handleAddBlankPage}>
          <PlusIcon className={`w-7 h-7 px-1 rounded`} />
        </button>
      )}
      {/*
       * Add a flex grow to push the tabs to the left
       */}
      <div className="flex grow"></div>
    </>
  );
}

type TabProps = {
  pageId: string;
};

function Tab({ pageId }: TabProps) {
  //
  // States & Refs
  //
  const refButton = useRef<HTMLButtonElement>(null);
  const page = useAppStore((state) => state.pages.find((page) => page.id === pageId));
  const selected = useAppStore((state) => state.activePageId === pageId);
  const catalogItem = useUserStore((state) => state.getCatalogItem(page?.itemId));

  //
  // Logic
  //
  const setActivePage = useAppStore((state) => state.setActivePage);
  const closePage = useAppStore((state) => state.closePage);
  const CloseButtonIcon = catalogItem?.modified ? CloseCircleIcon : CloseIcon;
  const Icon = catalogItem.icon;

  // Select the page when the tab is clicked
  const handleClick = useCallback((pageId: string) => {
    setActivePage(pageId);
  }, []);

  // Close the page when the close button is clicked
  const onClose = useCallback((pageId: string) => {
    closePage(pageId);
  }, []);

  useEffect(() => {
    // Scroll the tab into view if it is selected
    if (selected && refButton.current) {
      refButton.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selected]);

  //
  // Rendering
  //
  const classes = {
    tab: cx(
      "flex items-center h-9 px-4 rounded w-48",
      selected && "shadow-sm shadow-blue-800 dark:shadow-blue-900",
      selected ? "bg-blue-400 dark:bg-blue-900" : tertiary("background", "hover:background"),
    ),
    title: "mx-2 text-xs font-medium text-left whitespace-nowrap overflow-hidden overflow-ellipsis",
    closeButton: cx(
      "flex ml-auto min-w-fit rounded",
      selected ? "hover:bg-blue-500 dark:hover:bg-blue-800" : "hover:bg-blue-800 dark:hover:bg-blue-700",
    ),
  };
  return (
    <button
      ref={refButton}
      className={classes.tab}
      onClick={() => {
        handleClick(page.id);
      }}
    >
      <Icon className="flex-shrink-0 w-5 h-5" />
      <span className={classes.title}>{catalogItem.title}</span>
      <a href="#" draggable="false" className={classes.closeButton}>
        <CloseButtonIcon
          className={`w-6 h-6 px-1 bg-transparent`}
          onClick={(event) => {
            onClose(page.id);
            event.stopPropagation();
          }}
        />
      </a>
    </button>
  );
}

PagesTabs.Tab = Tab;

export default PagesTabs;
