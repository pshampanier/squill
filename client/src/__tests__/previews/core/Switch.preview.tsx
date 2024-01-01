import Switch from "@/components/core/Switch";
import PreviewBox from "../PreviewBox";
import Preview from "../Preview";

export default function SwitchPreview() {
  return (
    <div className="flex flex-col space-y-10 w-3/4">
      <Preview>
        <Preview.Title>Sizes</Preview.Title>
        <Preview.Description>
          Four sizes available from <b>xs</b> to <b>lg</b>.
        </Preview.Description>
        <PreviewBox>
          <div className="flex flex-col space-y-2 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <Switch size="xs" id="size-xs" /> <label htmlFor="size-xs">xs</label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch size="sm" id="size-sm" /> <label htmlFor="size-sm">sm</label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch size="md" id="size-md" /> <label htmlFor="size-md">md</label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch size="lg" id="size-lg" /> <label htmlFor="size-lg">lg</label>
            </div>
          </div>
        </PreviewBox>
      </Preview>
      <Preview>
        <Preview.Title>Disabled</Preview.Title>
        <Preview.Description>Disabled switch.</Preview.Description>
        <PreviewBox>
          <div className="flex flex-col space-y-2">
            <Switch size="md" disabled />
          </div>
        </PreviewBox>
      </Preview>
      <Preview>
        <Preview.Title>Labels</Preview.Title>
        <Preview.Description>Labels can be associated to the switch.</Preview.Description>
        <PreviewBox>
          <div className="flex flex-col space-y-2 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <Switch id="label-unchecked" /> <label htmlFor="label-unchecked">Unchecked</label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch size="md" id="label-checked" defaultChecked /> <label htmlFor="label-checked">Checked</label>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="label-onoff">off</label>
              <Switch size="md" id="label-onoff" /> <label htmlFor="label-onoff">on</label>
            </div>
          </div>
        </PreviewBox>
      </Preview>
    </div>
  );
}
