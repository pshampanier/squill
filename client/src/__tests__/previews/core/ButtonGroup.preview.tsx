import ButtonGroup from "@/components/core/ButtonGroup";
import PreviewBox from "../PreviewBox";
import Preview from "../Preview";

import ThemeLightIcon from "@/icons/theme-light.svg?react";
import ThemeDarkIcon from "@/icons/theme-dark.svg?react";
import AppleLogoIcon from "@/icons/apple-logo.svg?react";

export default function SwitchPreview() {
  return (
    <div className="flex flex-col space-y-10 w-3/4">
      <Preview>
        <Preview.Title>Sizes</Preview.Title>
        <Preview.Description>
          Four sizes available from <b>xs</b> to <b>lg</b>.
        </Preview.Description>
        <PreviewBox className="flex text-sm text-gray-500">
          <div className="flex flex-col space-y-2">
            <div className="inline-flex space-x-4 items-center">
              <ButtonGroup defaultValue="one" size="xs">
                <ButtonGroup.Item name="one" label="one" />
                <ButtonGroup.Item name="two" label="two" />
                <ButtonGroup.Item name="three" label="three" />
                <ButtonGroup.Item name="four" label="four" />
              </ButtonGroup>
              <label>xs</label>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <ButtonGroup defaultValue="two" size="sm">
                <ButtonGroup.Item name="one" label="one" />
                <ButtonGroup.Item name="two" label="two" />
                <ButtonGroup.Item name="three" label="three" />
                <ButtonGroup.Item name="four" label="four" />
              </ButtonGroup>
              <label>sm</label>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <ButtonGroup defaultValue="three">
                <ButtonGroup.Item name="one" label="one" />
                <ButtonGroup.Item name="two" label="two" />
                <ButtonGroup.Item name="three" label="three" />
                <ButtonGroup.Item name="four" label="four" />
              </ButtonGroup>
              <label>md (default)</label>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <ButtonGroup defaultValue="four" size="lg">
                <ButtonGroup.Item name="one" label="one" />
                <ButtonGroup.Item name="two" label="two" />
                <ButtonGroup.Item name="three" label="three" />
                <ButtonGroup.Item name="four" label="four" />
              </ButtonGroup>
              <label>lg</label>
            </div>
          </div>
        </PreviewBox>
      </Preview>
      <Preview>
        <Preview.Title>Disabled</Preview.Title>
        <Preview.Description>The whole group can be disabled or only some buttons.</Preview.Description>
        <PreviewBox className="flex text-sm text-gray-500">
          <div className="flex flex-col space-y-2">
            <div className="inline-flex space-x-4 items-center">
              <ButtonGroup defaultValue="one">
                <ButtonGroup.Item name="one" label="one" />
                <ButtonGroup.Item name="two" label="two" />
                <ButtonGroup.Item name="three" label="three" disabled />
              </ButtonGroup>
              <label>
                <b>three</b> is disabled
              </label>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <ButtonGroup defaultValue="three">
                <ButtonGroup.Item name="one" label="one" />
                <ButtonGroup.Item name="two" label="two" />
                <ButtonGroup.Item name="three" label="three" disabled />
              </ButtonGroup>
              <label>
                <b>three</b> is disabled and selected
              </label>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <ButtonGroup defaultValue="one" disabled>
                <ButtonGroup.Item name="one" label="one" />
                <ButtonGroup.Item name="two" label="two" />
                <ButtonGroup.Item name="three" label="three" disabled />
              </ButtonGroup>
              <label>the group is disabled</label>
            </div>
          </div>
        </PreviewBox>
      </Preview>
      <Preview>
        <Preview.Title>With icons</Preview.Title>
        <Preview.Description>Icons can be used with or without text.</Preview.Description>
        <PreviewBox className="flex text-sm text-gray-500">
          <div className="flex flex-col space-y-2">
            <div className="inline-flex space-x-4 items-center">
              <ButtonGroup defaultValue="light">
                <ButtonGroup.Item name="light" label="light" icon={ThemeLightIcon} />
                <ButtonGroup.Item name="dark" label="dark" icon={ThemeDarkIcon} />
                <ButtonGroup.Item name="auto" label="auto" icon={AppleLogoIcon} />
              </ButtonGroup>
              <label>icon with text</label>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <ButtonGroup defaultValue="light">
                <ButtonGroup.Item name="light" icon={ThemeLightIcon} />
                <ButtonGroup.Item name="dark" icon={ThemeDarkIcon} />
                <ButtonGroup.Item name="auto" icon={AppleLogoIcon} />
              </ButtonGroup>
              <label>icon only</label>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <ButtonGroup defaultValue="light" disabled>
                <ButtonGroup.Item name="light" icon={ThemeLightIcon} />
                <ButtonGroup.Item name="dark" icon={ThemeDarkIcon} />
                <ButtonGroup.Item name="auto" icon={AppleLogoIcon} />
              </ButtonGroup>
              <label>disabled icons</label>
            </div>
          </div>
        </PreviewBox>
      </Preview>
    </div>
  );
}
