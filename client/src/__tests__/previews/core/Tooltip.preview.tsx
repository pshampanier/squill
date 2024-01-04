import Tooltip from "@/components/core/Tooltip";
import PreviewBox from "../PreviewBox";

export default function TooltipPreview() {
  return (
    <PreviewBox className="items-center">
      <div className="grid grid-cols-3 w-full">
        <div className="col-span-3 flex justify-center items-end">
          <Tooltip
            text="This is a very long tooltip, with a lot of text and even more text"
            position="top"
            align="center"
            theme="tooltip"
          >
            <button className="rounded-md bg-gray-200 p-2 group">TOP</button>
          </Tooltip>
        </div>
        <div className="col-span-1 flex justify-end items-center">
          <button className="h-10 rounded-md bg-gray-200 p-2">LEFT</button>
        </div>
        <div className="col-span-1"></div>
        <div className="col-span-1 flex justify-start items-center">
          <button className="h-10 rounded-md bg-gray-200 p-2">RIGHT</button>
        </div>
        <div className="col-span-3 flex justify-center items-start">
          <button className="rounded-md bg-gray-200 p-2">BOTTOM</button>
        </div>
      </div>
    </PreviewBox>
  );
}
