import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import QueryPrompt from "@/components/query/QueryPrompt";
import ClockIcon from "@/icons/clock.svg?react";

export default function QueryPromptPreview() {
  return (
    <>
      <Preview>
        <Preview.Title>Query Prompt</Preview.Title>
        <Preview.Description>xxx</Preview.Description>
        <PreviewBox className="items-center h-[1000px]">
          <QueryPrompt>
            <span className="flex space-x-2 items-center">
              <span>postgres@adworks</span>
            </span>
            <span className="flex space-x-2 items-center">
              <ClockIcon />
              <span>12:22</span>
            </span>
          </QueryPrompt>
          <QueryPrompt>
            <span>one</span>
            <span>two</span>
            <span>three</span>
            <span>four</span>
            <span>five</span>
            <span>six</span>
            <span>seven</span>
            <span>eight</span>
            <span>nine</span>
            <span>ten</span>
            <span>eleven</span>
            <span>twelve</span>
          </QueryPrompt>
        </PreviewBox>
      </Preview>
    </>
  );
}
