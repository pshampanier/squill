import LoadingContainer from "@/components/core/LoadingContainer";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { useState } from "react";

export default function LoadingContainerPreview() {
  const [status, setStatus] = useState<"pending" | "error" | "success">("pending");

  return (
    <>
      {/*
       * Status loading
       */}
      <Preview>
        <Preview.Title>Loading</Preview.Title>
        <Preview.Description>
          A placeholder container displayed while loading something is loading, click{" "}
          <a href="#" draggable="false" onClick={() => setStatus("error")}>
            here
          </a>{" "}
          to simulate an error.
        </Preview.Description>
        <PreviewBox className="h-96">
          <LoadingContainer
            message="Loading"
            errorFallback="Oops! Something went wrong..."
            status={status}
            error={undefined}
            onRetry={() => setStatus("pending")}
          />
        </PreviewBox>
      </Preview>
    </>
  );
}
