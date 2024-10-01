import TreeView, { TreeViewStatus } from "@/components/core/TreeView";
import FolderIcon from "@/icons/folder.svg?react";
import UserIcon from "@/icons/user.svg?react";
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

function TreeItem({ item }: { item: FolderOrUser }) {
  const handleClick = (
    event: React.MouseEvent<HTMLElement>,
    setStatus: React.Dispatch<React.SetStateAction<TreeViewStatus>>,
  ) => {
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

  if (item.children !== undefined) {
    return (
      <TreeView.Item icon={FolderIcon} label={item.name} onClick={handleClick} collapsible>
        {item.children.map((child) => (
          <TreeItem key={child.id} item={child} />
        ))}
      </TreeView.Item>
    );
  } else {
    return <TreeView.Item icon={UserIcon} label={item.name} onClick={handleClick} />;
  }
}

export default function TreeviewStaticPreview() {
  return (
    <TreeView className="w-60 h-96 border border-dashed rounded">
      {ITEMS.map((item) => (
        <TreeItem key={item.id} item={item} />
      ))}
    </TreeView>
  );
}
