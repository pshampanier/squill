import QueryTerminal from "@/components/query/QueryTerminal";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { usePreviewsStore } from "../previewsStore";
import QueryPrompt from "@/components/query/QueryPrompt";
import ClockIcon from "@/icons/clock.svg?react";

export default function QueryTerminalPreview() {
  const colorScheme = usePreviewsStore((state) => state.colorScheme);

  const handleValidate = (query: string) => {
    console.log(query);
  };

  return (
    <>
      {/*
       * Terminal
       */}
      <Preview>
        <Preview.Title>Terminal</Preview.Title>
        <Preview.Description>xxx</Preview.Description>
        <PreviewBox className="items-center h-[1000px]">
          <QueryTerminal onValidate={handleValidate} colorScheme={colorScheme} prompt={<SessionQueryPrompt />} />
        </PreviewBox>
      </Preview>
    </>
  );
}

function SessionQueryPrompt() {
  return (
    <QueryPrompt>
      <span className="flex space-x-2 items-center">
        <span>postgres@adworks</span>
      </span>
      <span className="flex space-x-2 items-center">
        <ClockIcon />
        <span>12:22</span>
      </span>
    </QueryPrompt>
  );
}
