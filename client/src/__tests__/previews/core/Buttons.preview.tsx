import Button from "@/components/core/Button";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import cx from "classix";
import { primary, secondary, tertiary } from "@/utils/colors";

import UserIcon from "@/icons/user.svg?react";
import ChevronIcon from "@/icons/chevron-right.svg?react";

export default function ButtonsPreview() {
  return (
    <>
      {/*
       * Types
       */}
      <Preview>
        <Preview.Title>Types</Preview.Title>
        <Preview.Description>Buttons exists in 3 variants.</Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="flex flex-col space-y-2">
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Primary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", primary("background"))}>
                <Button text="Solid" variant="solid" colors={primary} />
                <Button text="Outline" variant="outline" colors={primary} />
                <Button text="Ghost" variant="ghost" colors={primary} />
              </div>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Secondary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", secondary("background"))}>
                <Button text="Solid" variant="solid" colors={secondary} />
                <Button text="Outline" variant="outline" colors={secondary} />
                <Button text="Ghost" variant="ghost" colors={secondary} />
              </div>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Tertiary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", tertiary("background"))}>
                <Button text="Solid" variant="solid" colors={tertiary} />
                <Button text="Outline" variant="outline" colors={tertiary} />
                <Button text="Ghost" variant="ghost" colors={tertiary} />
              </div>
            </div>
          </div>
        </PreviewBox>
      </Preview>
      {/*
       * Icons
       */}
      <Preview>
        <Preview.Title>With icons</Preview.Title>
        <Preview.Description>Buttons can have an icon with text or just an icon.</Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="flex flex-col space-y-2">
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Primary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", primary("background"))}>
                <Button text="Solid" variant="solid" colors={primary} icon={UserIcon} />
                <Button variant="solid" colors={primary} icon={UserIcon} />
                <Button text="Outline" variant="outline" colors={primary} icon={UserIcon} />
                <Button variant="outline" colors={primary} icon={UserIcon} />
                <Button text="Ghost" variant="ghost" colors={primary} icon={UserIcon} />
                <Button variant="ghost" colors={primary} icon={UserIcon} />
              </div>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Secondary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", secondary("background"))}>
                <Button text="Solid" variant="solid" colors={secondary} icon={UserIcon} />
                <Button variant="solid" colors={secondary} icon={UserIcon} />
                <Button text="Outline" variant="outline" colors={secondary} icon={UserIcon} />
                <Button variant="outline" colors={secondary} icon={UserIcon} />
                <Button text="Ghost" variant="ghost" colors={secondary} icon={UserIcon} />
                <Button variant="ghost" colors={secondary} icon={UserIcon} />
              </div>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Tertiary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", tertiary("background"))}>
                <Button text="Solid" variant="solid" colors={tertiary} icon={UserIcon} />
                <Button variant="solid" colors={tertiary} icon={UserIcon} />
                <Button text="Outline" variant="outline" colors={tertiary} icon={UserIcon} />
                <Button variant="outline" colors={tertiary} icon={UserIcon} />
                <Button text="Ghost" variant="ghost" colors={tertiary} icon={UserIcon} />
                <Button variant="ghost" colors={tertiary} icon={UserIcon} />
              </div>
            </div>
          </div>
        </PreviewBox>
      </Preview>
      {/*
       * Disabled
       */}
      <Preview>
        <Preview.Title>Disabled</Preview.Title>
        <Preview.Description>Buttons can be disabled.</Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="flex flex-col space-y-2">
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Primary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", primary("background"))}>
                <Button text="Solid" variant="solid" colors={primary} disabled />
                <Button text="Outline" variant="outline" colors={primary} disabled />
                <Button text="Ghost" variant="ghost" colors={primary} disabled />
              </div>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Secondary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", secondary("background"))}>
                <Button text="Solid" variant="solid" colors={secondary} disabled />
                <Button text="Outline" variant="outline" colors={secondary} disabled />
                <Button text="Ghost" variant="ghost" colors={secondary} disabled />
              </div>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Tertiary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", tertiary("background"))}>
                <Button text="Solid" variant="solid" colors={tertiary} disabled />
                <Button text="Outline" variant="outline" colors={tertiary} disabled />
                <Button text="Ghost" variant="ghost" colors={tertiary} disabled />
              </div>
            </div>
          </div>
        </PreviewBox>
      </Preview>
      {/*
       * Custom
       */}
      <Preview>
        <Preview.Title>Custom</Preview.Title>
        <Preview.Description>Button&apos;s content can be customized.</Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="inline-flex space-x-4 items-center">
            <span className="w-40">Secondary colors</span>
            <div className={cx("inline-flex space-x-4 items-center p-2 rounded", secondary("background"))}>
              <Button variant="solid" colors={secondary} className="w-24">
                <span>Solid</span>
                <ChevronIcon className="w-4 h-4 rotate-90 ml-auto" />
              </Button>
              <Button variant="outline" colors={secondary} className="w-24">
                <span>Outline</span>
                <ChevronIcon className="w-4 h-4 rotate-90 ml-auto" />
              </Button>
              <Button variant="ghost" colors={secondary} className="w-24">
                <span>Ghost</span>
                <ChevronIcon className="w-4 h-4 rotate-90 ml-auto" />
              </Button>
            </div>
          </div>
        </PreviewBox>
      </Preview>
    </>
  );
}
