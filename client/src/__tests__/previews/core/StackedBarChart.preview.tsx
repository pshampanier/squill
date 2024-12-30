import StackedBarChart from "@/components/core/StackedBarChart";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";

export default function StackedBarChartPreview() {
  return (
    <>
      <Preview>
        <Preview.Title>StackedBarChart</Preview.Title>
        <Preview.Description>A chart displaying stacked horizontal bar.</Preview.Description>
        <PreviewBox className="h-fit">
          <StackedBarChart
            data={[
              { value: 10, displayValue: "10", label: "Label 1" },
              { value: 20, displayValue: "20", label: "Label 2" },
              { value: 30, displayValue: "30", label: "Label 3" },
            ]}
          />
          <StackedBarChart
            displayCallback={(d) => `${d.value} GB`}
            data={[
              { value: 300, label: "Label 1" },
              { value: 10, label: "Label 2" },
              { value: 30, label: "Label 3" },
              { value: 40, label: "Label 4" },
              { value: 50, label: "Label 5" },
              { value: 20, label: "Label 6" },
              { value: 70, label: "Label 7" },
              { value: 80, label: "Label 8" },
              { value: 90, label: "Label 9" },
              { value: 100, label: "Label 10" },
            ]}
          />
          <StackedBarChart
            displayCallback={(d) => `${d.value} GB`}
            data={[
              { value: 300, label: "Label 1" },
              { value: 10, label: "Label 2" },
              { value: 30, label: "Label 3" },
              { value: 40, label: "Label 4" },
              { value: 50, label: "Label 5" },
              { value: 20, label: "Label 6" },
              { value: 70, label: "Label 7" },
              { value: 80, label: "Label 8" },
              { value: 90, label: "Label 9" },
              { value: 100, label: "Label 10" },
              { value: 25, label: "Label 11" },
              { value: 35, label: "Label 12" },
              { value: 45, label: "Label 13" },
              { value: 55, label: "Label 14" },
            ]}
          />
          <StackedBarChart data={[]} />
          <StackedBarChart
            data={[
              { value: 0, displayValue: "10", label: "Label 1" },
              { value: 0, displayValue: "20", label: "Label 2" },
            ]}
          />
        </PreviewBox>
      </Preview>
    </>
  );
}
