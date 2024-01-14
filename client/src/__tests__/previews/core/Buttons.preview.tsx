import Button from "@/components/core/Button";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import cx from "classix";
import { primary, secondary, tertiary } from "@/utils/colors";

import UserIcon from "@/icons/user.svg?react";

export default function ButtonsPreview() {
  return (
    <>
      {/*
       * Types
       */}
      <Preview>
        <Preview.Title>Types</Preview.Title>
        <Preview.Description>Buttons exists in 3 different types.</Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="flex flex-col space-y-2">
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Primary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", primary("background"))}>
                <Button text="Solid" type="solid" colors={primary} />
                <Button text="Outline" type="outline" colors={primary} />
                <Button text="Ghost" type="ghost" colors={primary} />
              </div>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Secondary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", secondary("background"))}>
                <Button text="Solid" type="solid" colors={secondary} />
                <Button text="Outline" type="outline" colors={secondary} />
                <Button text="Ghost" type="ghost" colors={secondary} />
              </div>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Terciary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", tertiary("background"))}>
                <Button text="Solid" type="solid" colors={tertiary} />
                <Button text="Outline" type="outline" colors={tertiary} />
                <Button text="Ghost" type="ghost" colors={tertiary} />
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
                <Button text="Solid" type="solid" colors={primary} icon={UserIcon} />
                <Button type="solid" colors={primary} icon={UserIcon} />
                <Button text="Outline" type="outline" colors={primary} icon={UserIcon} />
                <Button type="outline" colors={primary} icon={UserIcon} />
                <Button text="Ghost" type="ghost" colors={primary} icon={UserIcon} />
                <Button type="ghost" colors={primary} icon={UserIcon} />
              </div>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Secondary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", secondary("background"))}>
                <Button text="Solid" type="solid" colors={secondary} icon={UserIcon} />
                <Button type="solid" colors={secondary} icon={UserIcon} />
                <Button text="Outline" type="outline" colors={secondary} icon={UserIcon} />
                <Button type="outline" colors={secondary} icon={UserIcon} />
                <Button text="Ghost" type="ghost" colors={secondary} icon={UserIcon} />
                <Button type="ghost" colors={secondary} icon={UserIcon} />
              </div>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Terciary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", tertiary("background"))}>
                <Button text="Solid" type="solid" colors={tertiary} icon={UserIcon} />
                <Button type="solid" colors={tertiary} icon={UserIcon} />
                <Button text="Outline" type="outline" colors={tertiary} icon={UserIcon} />
                <Button type="outline" colors={tertiary} icon={UserIcon} />
                <Button text="Ghost" type="ghost" colors={tertiary} icon={UserIcon} />
                <Button type="ghost" colors={tertiary} icon={UserIcon} />
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
                <Button text="Solid" type="solid" colors={primary} disabled />
                <Button text="Outline" type="outline" colors={primary} disabled />
                <Button text="Ghost" type="ghost" colors={primary} disabled />
              </div>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Secondary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", secondary("background"))}>
                <Button text="Solid" type="solid" colors={secondary} disabled />
                <Button text="Outline" type="outline" colors={secondary} disabled />
                <Button text="Ghost" type="ghost" colors={secondary} disabled />
              </div>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">Terciary colors</span>
              <div className={cx("inline-flex space-x-4 items-center p-2 rounded", tertiary("background"))}>
                <Button text="Solid" type="solid" colors={tertiary} disabled />
                <Button text="Outline" type="outline" colors={tertiary} disabled />
                <Button text="Ghost" type="ghost" colors={tertiary} disabled />
              </div>
            </div>
          </div>
        </PreviewBox>
      </Preview>
    </>
  );
}
