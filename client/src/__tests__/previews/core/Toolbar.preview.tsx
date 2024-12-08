import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { secondary, tertiary } from "@/utils/colors";
import Toolbar from "@/components/core/Toolbar";
import Button from "@/components/core/Button";
import StarIcon from "@/icons/star.svg?react";
import CopyIcon from "@/icons/clipboard-copy.svg?react";
import ArrowsPointingOutIcon from "@/icons/arrows-pointing-out.svg?react";
import { ColorsContext } from "@/stores/ColorsContext";

export default function ToolbarPreview() {
  return (
    <>
      {/*
       * Background
       */}
      <Preview>
        <Preview.Title>Toolbar</Preview.Title>
        <Preview.Description>The toolbar component can be used with different background colors.</Preview.Description>
        <PreviewBox className="flex text-sm">
          <div className="inline-flex space-x-4 items-center">
            <span className="w-40">Primary</span>
            <Toolbar>
              <Button icon={StarIcon} />
              <Button icon={CopyIcon} />
              <Button icon={ArrowsPointingOutIcon} />
            </Toolbar>
          </div>
          <div className="inline-flex space-x-4 items-center">
            <span className="w-40">Secondary</span>
            <ColorsContext.Provider value={secondary}>
              <Toolbar>
                <Button icon={StarIcon} />
                <Button icon={CopyIcon} />
                <Button icon={ArrowsPointingOutIcon} />
              </Toolbar>
            </ColorsContext.Provider>
          </div>
          <div className="inline-flex space-x-4 items-center">
            <span className="w-40">Tertiary</span>
            <ColorsContext.Provider value={tertiary}>
              <Toolbar>
                <Button icon={StarIcon} />
                <Button icon={CopyIcon} />
                <Button icon={ArrowsPointingOutIcon} />
              </Toolbar>
            </ColorsContext.Provider>
          </div>
        </PreviewBox>
      </Preview>
      {/*
       * Sizes
       */}
      <Preview>
        <Preview.Title>Toolbar</Preview.Title>
        <Preview.Description>The toolbar exists in different size.</Preview.Description>
        <ColorsContext.Provider value={secondary}>
          <PreviewBox className="flex text-sm">
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">xs</span>
              <Toolbar size="xs">
                <Button size="xs" icon={StarIcon} />
                <Button size="xs" icon={CopyIcon} />
                <Button size="xs" icon={ArrowsPointingOutIcon} />
              </Toolbar>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">sm</span>
              <Toolbar size="sm">
                <Button size="sm" icon={StarIcon} />
                <Button size="sm" icon={CopyIcon} />
                <Button size="sm" icon={ArrowsPointingOutIcon} />
              </Toolbar>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">md</span>
              <Toolbar size="md">
                <Button size="md" icon={StarIcon} />
                <Button size="md" icon={CopyIcon} />
                <Button size="md" icon={ArrowsPointingOutIcon} />
              </Toolbar>
            </div>
            <div className="inline-flex space-x-4 items-center">
              <span className="w-40">lg</span>
              <Toolbar size="lg">
                <Button size="lg" icon={StarIcon} />
                <Button size="lg" icon={CopyIcon} />
                <Button size="lg" icon={ArrowsPointingOutIcon} />
              </Toolbar>
            </div>
          </PreviewBox>
        </ColorsContext.Provider>
      </Preview>
    </>
  );
}
