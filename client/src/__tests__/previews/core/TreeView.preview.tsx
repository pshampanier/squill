import cx from "classix";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import TreeviewInteractivePreview from "./Treeview.interactive.preview";
import TreeviewStaticPreview from "./Treeview.static.preview";
import { primary, secondary } from "@/utils/colors";

export default function TreeViewPreview() {
  return (
    <>
      {/*
       * Simple TreeView
       */}
      <Preview>
        <Preview.Title>Static TreeView</Preview.Title>
        <Preview.Description>Syntax Highlighting for sql.</Preview.Description>
        <PreviewBox>
          <div className="flex flex-row space-x-6">
            <div className={cx(primary("background"), "flex w-fit")}>
              <TreeviewStaticPreview colors={primary} />
            </div>
            <div className={cx(secondary("background"), "flex w-fit")}>
              <TreeviewStaticPreview colors={secondary} />
            </div>
          </div>
        </PreviewBox>
      </Preview>
      {/*
       * Interative TreeView
       */}
      <Preview>
        <Preview.Title>Static TreeView</Preview.Title>
        <Preview.Description>Syntax Highlighting for sql.</Preview.Description>
        <PreviewBox>
          <TreeviewInteractivePreview />
        </PreviewBox>
      </Preview>
    </>
  );
}
