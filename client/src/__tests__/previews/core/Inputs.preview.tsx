import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import Input from "@/components/core/Input";
import Icon from "@/icons/user.svg?react";
import FileInput from "@/components/core/FileInput";

export default function InputsPreview() {
  return (
    <>
      {/*
       * Sizes
       */}
      <Preview>
        <Preview.Title>Sizes</Preview.Title>
        <Preview.Description>
          Inputs have 4 possible sizes: <b>sm</b>, <b>md</b>, <b>lg</b>, <b>full</b> (default).
        </Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="flex flex-col space-y-4 w-full">
            <Input type="text" size="sm" label="Small" placeholder="Enter a value" />
            <Input type="text" size="md" label="Medium" placeholder="Enter a value" />
            <Input type="text" size="lg" label="Large" placeholder="Enter a value" />
            <Input type="text" size="auto" label="Full" placeholder="Enter a value" />
          </div>
        </PreviewBox>
      </Preview>

      {/*
       * Validation
       */}
      <Preview>
        <Preview.Title>Validation</Preview.Title>
        <Preview.Description>Input are validated when loosing focus or when submitted.</Preview.Description>
        <PreviewBox className="flex text-sm">
          <form className="flex flex-col space-y-2">
            <Input size="lg" type="text" label="First Name" placeholder="Enter your name" required />
            <Input size="lg" type="text" label="Last Name" placeholder="Enter your name" required />
            <input type="submit" className="text-center p-3 rounded bg-blue-500 text-white cursor-pointer" />
          </form>
        </PreviewBox>
      </Preview>

      {/*
       * Prefix and Suffix
       */}
      <Preview>
        <Preview.Title>Prefix and Suffix</Preview.Title>
        <Preview.Description>Input can embed a prefix, a suffix or both...</Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="flex flex-col space-y-4">
            <div className="flex space-x-2">
              <Input
                size="lg"
                type="text"
                label="Prefix using an icon"
                placeholder="Enter a value"
                prefix={<Icon className="w-6 h-6 text-blue-500" />}
              />
              <Input
                size="lg"
                type="text"
                label="Suffix using an icon"
                placeholder="Enter a value"
                suffix={<Icon className="w-6 h-6 text-blue-500" />}
              />
            </div>
            <div className="flex space-x-2">
              <Input size="lg" type="text" label="Prefix using a text" placeholder="Enter a value" prefix="USD" />
              <Input size="lg" type="text" label="Suffix using a text" placeholder="Enter a value" suffix="USD" />
            </div>
            <div className="flex space-x-2">
              <Input
                type="text"
                size="lg"
                label="Using both prefix and suffix simultaneously"
                placeholder="Enter a value"
                prefix={<Icon className="w-6 h-6 text-blue-500" />}
                suffix="USD"
              />
            </div>
          </div>
        </PreviewBox>
      </Preview>

      {/*
       * Types
       */}
      <Preview>
        <Preview.Title>Types</Preview.Title>
        <Preview.Description>
          The following input types are supported <kbd>text</kbd>, <kbd>password</kbd> and <kbd>number</kbd>.
        </Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="flex flex-col space-y-2 w-96">
            <Input type="text" label="Text" placeholder="Enter a text" />
            <Input type="password" label="Password" placeholder="Enter your password" />
            <Input type="number" label="Number" placeholder="5432" min={0} max={65535} />
            <FileInput name="file" label="File" help="PNG, JPG or PDF, smaller than 15MB" mode="input" />
          </div>
        </PreviewBox>
      </Preview>
    </>
  );
}
