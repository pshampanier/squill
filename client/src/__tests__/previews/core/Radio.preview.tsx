import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import Radio from "@/components/core/Radio";

export default function RadioPreview() {
  return (
    <>
      {/*
       * Default Radio
       */}
      <Preview>
        <Preview.Title>Default Radio</Preview.Title>
        <Preview.Description>
          The Radio component is used to select one option from a list of options.
        </Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="flex flex-col space-y-4 w-full">
            <Radio name="size" value="one" label="Option One" />
            <Radio name="size" value="two" label="Option Two" defaultChecked />
            <Radio name="size" value="three" label="Option Three" />
            <Radio name="size" value="four" label="Option Disabled" disabled />
          </div>
        </PreviewBox>
      </Preview>
      {/*
       * Validation
       */}
      <Preview>
        <Preview.Title>Validation</Preview.Title>

        <Preview.Description>Radio inputs are validated when submitted.</Preview.Description>
        <PreviewBox className="flex text-sm">
          <form className="flex flex-col space-y-4 w-full">
            <Radio name="size" value="one" label="Option One" />
            <Radio name="size" value="two" label="Option Two" required />
            <input type="submit" className="text-center p-3 rounded bg-blue-500 text-white cursor-pointer" />
          </form>
        </PreviewBox>
      </Preview>
    </>
  );
}
