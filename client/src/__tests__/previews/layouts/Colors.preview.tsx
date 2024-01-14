import cx from "classix";
import { colors, PRIMARY_COLORS, COLOR_NAMES, SECONDARY_COLORS, TERTIARY_COLORS } from "@/utils/colors";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";

import ClipboardCopyIcon from "@/icons/clipboard-copy.svg?react";

const COPY_ICON_CLASSES = cx(
  "ml-auto w-6 h-6 p-1 rounded cursor-pointer",
  "opacity-0 group-hover:opacity-100 ease-in-out duration-200 transition-all",
  "hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 hover:dark:bg-gray-700"
);

export default function ColorsPreview() {
  return (
    <>
      <Preview>
        <Preview.Title>Primary colors</Preview.Title>
        <Preview.Description>Colors usage.</Preview.Description>
        <PreviewBox className="flex text-sm text-gray-500">
          <div className="flex flex-col space-y-2">
            {COLOR_NAMES.map((color) => (
              <ColorPreview key={color} palette={PRIMARY_COLORS} name={color} />
            ))}
          </div>
        </PreviewBox>
      </Preview>
      <Preview>
        <Preview.Title>Secondary colors</Preview.Title>
        <Preview.Description>Colors usage.</Preview.Description>
        <PreviewBox className="flex text-sm text-gray-500">
          <div className="flex flex-col space-y-2">
            {COLOR_NAMES.map((color) => (
              <ColorPreview key={color} palette={SECONDARY_COLORS} name={color} />
            ))}
          </div>
        </PreviewBox>
      </Preview>
      <Preview>
        <Preview.Title>Terciary colors</Preview.Title>
        <Preview.Description>Colors usage.</Preview.Description>
        <PreviewBox className="flex text-sm text-gray-500">
          <div className="flex flex-col space-y-2">
            {COLOR_NAMES.map((color) => (
              <ColorPreview key={color} palette={TERTIARY_COLORS} name={color} />
            ))}
          </div>
        </PreviewBox>
      </Preview>
    </>
  );
}

type ColorPreviewProps<T extends string> = {
  name: T;
  palette: Record<T, string>;
};

/**
 * Convert a color name to background color name (removing any modifiers).
 * Ex: "dark:text-gray-700" -> "bg-gray-700"
 */
function toBackgoundColor(className: string) {
  return className.replace(/^[^-]*/, "bg");
}

function ColorPreview<T extends string>({ name, palette }: ColorPreviewProps<T>) {
  const _colors = colors(palette, name)?.split(" ");
  if (!_colors) return null;
  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(name);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };
  return (
    <div className="inline-flex space-x-4 items-center">
      <label className="flex flex-shrink-0 w-[300px] font-semibold group items-center">
        {name}
        <ClipboardCopyIcon className={COPY_ICON_CLASSES} onClick={handleClick} />
      </label>
      <div
        className={cx(
          "flex flex-shrink-0 w-4 h-4 rounded border border-gray-200 dark:border-gray-600",
          toBackgoundColor(_colors[0]),
          `dark:${toBackgoundColor(_colors[1])}`
        )}
      />
      <span className="font-mono text-xs flex-shrink-0">
        {_colors[0]} {_colors[1]}
      </span>
    </div>
  );
}
