import Button from "@/components/core/Button";
import SidePanel from "@/components/core/SidePanel";
import { useState } from "react";

export default function SidePanelExample() {
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);

  return (
    <>
      <div className="flex flex-row space-x-2 w-full">
        <Button variant="outline" onClick={() => setLeftPanelVisible(!leftPanelVisible)}>
          Toggle Left Panel
        </Button>
        <Button variant="outline" onClick={() => setRightPanelVisible(!rightPanelVisible)}>
          Toggle Right Panel
        </Button>
      </div>
      <div className="flex flex-row w-full h-14 overflow-hidden bg-gray-200  dark:bg-gray-700 select-none">
        <SidePanel
          className="flex bg-gray-300 dark:bg-gray-600 rounded p-4"
          visible={leftPanelVisible}
          variant="left"
          size={200}
          minSize={100}
          maxSize={300}
          resizable
        >
          LEFT
        </SidePanel>
        <div className="bg-gray-200  dark:bg-gray-700 rounded p-4 flex flex-grow flex-row">
          <div className="flex text-left flex-grow">CENTER</div>
          <div className="flex justify-end flex-grow">CENTER</div>
        </div>
        <SidePanel
          className="bg-gray-300  dark:bg-gray-600 rounded p-4 w-32"
          visible={rightPanelVisible}
          variant="right"
          resizable
          size={200}
          minSize={100}
          maxSize={300}
        >
          RIGHT
        </SidePanel>
      </div>
    </>
  );
}
