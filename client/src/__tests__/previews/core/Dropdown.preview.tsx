import Dropdown, { DropdownValue } from "@/components/core/Dropdown";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { primary } from "@/utils/colors";

export default function DropdownPreview() {
  const values: DropdownValue[] = [
    { value: "1", label: "Option 1" },
    { value: "2", label: "Option 2" },
    { value: "3", label: "Option 3" },
    { value: "4", label: "Option 4 is very long and should not fit!" },
  ];

  return (
    <>
      {/*
       * Variants
       */}
      <Preview>
        <Preview.Title>Types</Preview.Title>
        <Preview.Description>Dropdown exists in 3 variants.</Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="grid grid-cols-3 gap-4">
            <span className="text-center font-bold">Solid</span>
            <span className="text-center font-bold">Outline (default)</span>
            <span className="text-center font-bold">Ghost</span>
            <Dropdown variant="solid" colors={primary} values={values} defaultValue="1" />
            <Dropdown variant="outline" colors={primary} values={values} defaultValue="2" />
            <Dropdown variant="ghost" colors={primary} values={values} defaultValue="3" />
          </div>
        </PreviewBox>
      </Preview>
      {/*
       * Sizes
       */}
      <Preview>
        <Preview.Title>Sizes</Preview.Title>
        <Preview.Description>Dropdown available on 3 sizes.</Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="flex flex-col space-y-2">
            <div className="inline-flex space-x-4 items-center">
              <Dropdown size="sm" colors={primary} values={values} defaultValue="1" />
              <label className="font-bold">sm</label>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <Dropdown size="md" colors={primary} values={values} defaultValue="1" />
              <label className="font-bold">md</label>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <Dropdown size="lg" colors={primary} values={values} defaultValue="1" />
              <label className="font-bold">lg</label>
            </div>
          </div>
        </PreviewBox>
      </Preview>
    </>
  );
}
