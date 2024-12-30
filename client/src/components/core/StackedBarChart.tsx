import cx from "classix";
import { useMemo } from "react";
import AutoHide from "@/components/core/AutoHide";

type ColorName =
  | "teal"
  | "soft_blue"
  | "amber"
  | "crimson_red"
  | "vivid_purple"
  | "leaf_green"
  | "bright_orange"
  | "sky_blue"
  | "graphite_gray"
  | "hot_pink";

type ColorPaletteItem = {
  name: ColorName;
  hex: string;
};

const COLOR_PALETTE: ColorPaletteItem[] = [
  { name: "crimson_red", hex: "#e74c3c" },
  { name: "teal", hex: "#26a69a" },
  { name: "soft_blue", hex: "#2980b9" },
  { name: "amber", hex: "#f1c40f" },
  { name: "vivid_purple", hex: "#9b59b6" },
  { name: "leaf_green", hex: "#2ecc71" },
  { name: "bright_orange", hex: "#f39c12" },
  { name: "sky_blue", hex: "#3498db" },
  { name: "hot_pink", hex: "#ec407a" },
  { name: "graphite_gray", hex: "#95a5a6" },
];

export type GraphValue = {
  /**
   * The raw value.
   */
  value: number;

  /**
   * A label associated with the value (displayed in the legend).
   */
  label: string;

  /**
   * The display value of the graph value.
   * If not provided, the display value wil be evaluated using the `displayCallback` provided to the component if any.
   * If the `displayCallback` is not provided, the display value will not be shown.
   */
  displayValue?: string;

  /**
   * The color of the graph value.
   * If not provided, the next available color in the palette will be used.
   */
  color?: ColorName;
};

type GraphValueWithWidth = GraphValue & { width: number };

type StackedBargraphProps = {
  /**
   * Additional class names to apply to the root element of the component.
   */
  className?: string;

  /**
   * The data to display in the graph.
   */
  data: GraphValue[];

  /**
   * A callback to format the display value of the graph value.
   * If the display value is not provided and that callback is provided, it will be called to generate the display value.
   */
  displayCallback?: (value: GraphValue) => string;
};

function getColorByName(name: ColorName): string {
  return COLOR_PALETTE.find((c) => c.name === name)?.hex || "teal";
}

/**
 * A React component that displays a stacked bar chart.
 *
 * The component will display the data as a stacked bar chart where each bar represents a value in the data.
 *
 * ```
 * ┌────────────────────────────┬──────────────────┬──────┐
 * │           30 GB            │      20 GB       │ 8 GB │
 * └────────────────────────────┴──────────────────┴──────┘
 *            * Disk 1   * Disk 2   * Disk 3
 * ```
 *
 * - The sum of all values will be used to calculate the width of each bar (the sum being 100%).
 * - If a display value is provided, it will be displayed in the center of the bar when the bar is large enough.
 * - The values are displayed in descending order.
 * - Labels are displayed below the bars in the same order as the values.
 * - If there is more than 10 values, the 9 largest values are displayed and the remaining will be grouped into an
 *   "Others" bar.
 * - If no data is provided or the total value of the data is 0, a single bar with the label "No data" will be displayed. *
 */
export default function StackedBarChart({ data: rawData, displayCallback, className }: StackedBargraphProps) {
  // Remove the colors the one that are explicitly used
  const usedColors = rawData.map((d) => d.color);
  const colors = COLOR_PALETTE.filter((c) => !usedColors.includes(c.name as ColorName));

  const data: GraphValueWithWidth[] = useMemo(() => {
    const total = rawData.reduce((acc, d) => acc + d.value, 0);
    if (!rawData.length || total === 0) {
      return [
        {
          value: 0,
          label: "No data",
          color: "graphite_gray",
          width: 100,
        },
      ];
    } else {
      // Calculate the total value of the data
      let data = rawData.sort((a, b) => b.value - a.value);
      if (data.length > 10) {
        data = data.slice(0, 9);
        data.push({
          value: total - data.reduce((acc, d) => acc + d.value, 0),
          label: "Others",
          color: "graphite_gray",
        });
      }
      return data.map((d) => {
        return {
          color: d.color || colors.shift()?.name || "teal", // If the color is not provided, use the next color in the palette
          displayValue: d.displayValue ?? (displayCallback ? displayCallback(d) : undefined),
          width: (d.value / total) * 100,
          ...d,
        };
      });
    }
  }, [rawData, displayCallback]);

  return (
    <div className="flex flex-col items-center w-full space-y-2">
      <div className={cx("flex flex-row items-center w-full h-8 space-x-0.5 rounded overflow-hidden", className)}>
        {data.map((d, i) => (
          <div
            key={i}
            className="h-full flex items-center dark:opacity-80 overflow-hidden"
            style={{ width: `${d.width}%`, backgroundColor: `${getColorByName(d.color)}` }}
          >
            {d.displayValue !== undefined && (
              <AutoHide variant="horizontal" className="w-full flex items-center justify-center">
                <span className="px-1 text-white text-nowrap font-semibold select-none">{d.displayValue}</span>
              </AutoHide>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {data.map((d, i) => (
          <div key={i} className="flex flex-row items-center space-x-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: `${getColorByName(d.color)}` }} />
            <div className="select-none">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
