import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import SidePanelExample from "./SidePanel.example.preview";
import ResizableSidePanel from "./ResizableSidePanel.example.preview";

export default function SidePanelPreview() {
  return (
    <>
      <Preview>
        <Preview.Title>SidePanel</Preview.Title>
        <Preview.Description>A SidePanel component.</Preview.Description>
        <PreviewBox className="h-40">
          <SidePanelExample />
        </PreviewBox>
      </Preview>
      <Preview>
        <Preview.Title>Resizable SidePanel</Preview.Title>
        <Preview.Description>A SidePanel component.</Preview.Description>
        <PreviewBox className="h-40">
          <ResizableSidePanel />
        </PreviewBox>
      </Preview>
    </>
  );
}
