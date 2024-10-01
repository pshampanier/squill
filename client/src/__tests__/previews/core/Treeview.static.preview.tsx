import TreeView from "@/components/core/TreeView";
import FolderIcon from "@/icons/folder.svg?react";
import UserIcon from "@/icons/user.svg?react";
import { ColorsFunction } from "@/utils/colors";

type TreeviewStaticPreviewProps = {
  colors: ColorsFunction;
};

export default function TreeviewStaticPreview({ colors }: TreeviewStaticPreviewProps) {
  return (
    <TreeView className="w-60 h-96 border border-dashed rounded" colors={colors}>
      <TreeView.Item icon={FolderIcon} label="McFly" collapsible defaultStatus="open">
        <TreeView.Item icon={UserIcon} label="Marty McFly" />
        <TreeView.Item icon={UserIcon} label="George McFly" />
      </TreeView.Item>
      <TreeView.Item icon={UserIcon} label="Doc Brown" selected />
      <TreeView.Item icon={UserIcon} label="Biff Tannen" defaultStatus="error" />
      <TreeView.Item icon={UserIcon} label="Jennifer Parker" defaultStatus="loading" />
      <TreeView.Item icon={UserIcon} label="Einstein" />
      <TreeView.Item icon={UserIcon} label="Clara Clayton" />
    </TreeView>
  );
}
