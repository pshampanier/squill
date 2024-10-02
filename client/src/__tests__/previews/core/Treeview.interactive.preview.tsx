import TreeView, { TreeViewStatus } from "@/components/core/TreeView";
import FolderIcon from "@/icons/folder.svg?react";
import UserIcon from "@/icons/user.svg?react";
import { secondary } from "@/utils/colors";
import cx from "classix";
import React from "react";

type FolderOrUser = {
  id: string;
  name: string;
  children?: FolderOrUser[];
};

const ITEMS: FolderOrUser[] = [
  { id: "1", name: "McFly", children: [{ id: "2", name: "Marty McFly" }] },
  { id: "3", name: "Doc Brown" },
  { id: "4", name: "Biff Tannen" },
  { id: "6", name: "Einstein" },
  {
    id: "7",
    name: "Others",
    children: [
      { id: "8", name: "Clara Clayton" },
      { id: "9", name: "Jennifer Parker" },
    ],
  },
];

function TreeItem({
  item,
  onChange,
  onSelect,
  selectedId,
}: {
  item: FolderOrUser;
  onChange?: (id: string, label: string) => void;
  onSelect?: (id: string) => void;
  selectedId: string | null;
}) {
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    setStatus: React.Dispatch<React.SetStateAction<TreeViewStatus>>,
  ) => {
    if (event.key === "Enter") {
      // If already editing it will apply the defaut dehavior of Enter key (validation), otherwise it will start editing
      setStatus("editing");
    }
  };

  const handleClick = (
    event: React.MouseEvent<HTMLElement>,
    setStatus: React.Dispatch<React.SetStateAction<TreeViewStatus>>,
  ) => {
    // We are only allowing leaf nodes to be selected
    if (item.children === undefined) {
      onSelect?.(item.id);
    }

    if (item.id === "7") {
      event.preventDefault();
      setStatus((prev) => {
        if (prev === "open") {
          return "closed";
        } else if (prev === "closed") {
          setTimeout(() => {
            setStatus((prev) => (prev === "loading" ? "open" : prev));
          }, 2000);
          return "loading";
        } else {
          return prev;
        }
      });
    } else if (item.id === "4") {
      event.preventDefault();
      setStatus("error");
    }
  };

  const handleEditBlur = (
    event: React.FocusEvent<HTMLInputElement>,
    setStatus: React.Dispatch<React.SetStateAction<TreeViewStatus>>,
  ) => {
    if (event.target.checkValidity()) {
      onChange?.(item.id, event.target.value);
      setStatus((prev) => (prev === "editing" ? "closed" : prev));
    } else {
      // If the input is invalid, focus it again
      event.target.focus();
      event.preventDefault();
      event.stopPropagation();
    }
  };

  if (item.children !== undefined) {
    return (
      <TreeView.Item
        icon={FolderIcon}
        label={item.name}
        onClick={handleClick}
        collapsible
        selected={item.id === selectedId}
      >
        {item.children.map((child) => (
          <TreeItem key={child.id} item={child} selectedId={selectedId} />
        ))}
      </TreeView.Item>
    );
  } else {
    return (
      <TreeView.Item
        icon={UserIcon}
        label={item.name}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onEditBlur={handleEditBlur}
        selected={item.id === selectedId}
      />
    );
  }
}

export default function TreeviewStaticPreview() {
  const [items, setItems] = React.useState(ITEMS);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const handleOnChange = (id: string, label: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, name: label };
        } else {
          return item;
        }
      }),
    );
  };

  const handleOnSelect = (id: string) => {
    setSelectedId(id);
  };

  return (
    <TreeView className={cx("w-60 h-96 border border-dashed rounded", secondary("background"))} colors={secondary}>
      {items.map((item) => (
        <TreeItem
          key={item.id}
          item={item}
          onChange={handleOnChange}
          selectedId={selectedId}
          onSelect={handleOnSelect}
        />
      ))}
    </TreeView>
  );
}
