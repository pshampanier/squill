import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import FileInput from "@/components/core/FileInput";

export default function FileInputPreview() {
  const handleOnChange = (event: React.FocusEvent<HTMLInputElement>, name?: string) => {
    if (name?.trim().length > 0 && !event.target.value.endsWith(".db")) {
      event.target.setCustomValidity("Invalid file extension");
      event.target.reportValidity();
      event.preventDefault();
    } else {
      event.target.setCustomValidity("");
      event.target.reportValidity();
    }
  };

  return (
    <>
      {/*
       * Types
       */}
      <Preview>
        <Preview.Title>Modes</Preview.Title>
        <Preview.Description>
          <kbd className="font-bold">input</kbd> mode will let the user choose a file from a text input.
        </Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="flex flex-col space-y-2 w-96">
            <form className="flex flex-col space-y-2">
              <FileInput
                name="file"
                label="File"
                help="PNG, JPG or PDF, smaller than 15MB"
                mode="input"
                onChange={handleOnChange}
                required
              />
              <input type="submit" className="text-center p-3 rounded bg-blue-500 text-white cursor-pointer" />
            </form>
          </div>
        </PreviewBox>
        <Preview.Description>
          <kbd className="font-bold">browser</kbd> mode is used to select a file from the browser.
        </Preview.Description>
        <PreviewBox className="flex">
          <div className="flex flex-col space-y-2 w-96">
            <FileInput name="file" label="File" help="PNG, JPG or PDF, smaller than 15MB" mode="browser" />
          </div>
        </PreviewBox>
      </Preview>
    </>
  );
}
