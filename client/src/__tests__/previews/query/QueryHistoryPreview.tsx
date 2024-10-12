import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import QueryHistoryExample from "./QueryHistory.example.preview";

export default function QueryHistoryPreview() {
  return (
    <>
      <Preview>
        <Preview.Title>QueryHistory</Preview.Title>
        <Preview.Description>A QueryHistory component.</Preview.Description>
        <PreviewBox className="h-[500px]">
          <div className="w-full h-full overflow-scroll">
            <QueryHistoryExample />
          </div>
        </PreviewBox>
      </Preview>
    </>
  );
}
