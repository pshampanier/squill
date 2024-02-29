import Stepper from "@/components/Stepper";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";

import WrenchIcon from "@/icons/wrench.svg?react";
import UserIcon from "@/icons/user.svg?react";
import StarIcon from "@/icons/star.svg?react";

export default function StepperPreview() {
  return (
    <>
      <Preview className="h-full">
        <Preview.Title>Stepper</Preview.Title>
        <Preview.Description>
          The Stepper component is a navigation component that allows users to navigate through a series of steps.
        </Preview.Description>
        <PreviewBox className="flex text-sm text-gray-500 h-full">
          <Stepper>
            <Stepper.Step icon={WrenchIcon} title="Choose Driver">
              <p>Step 1 content</p>
            </Stepper.Step>
            <Stepper.Step icon={StarIcon} title="Connection">
              <p>Step 2 content</p>
            </Stepper.Step>
            <Stepper.Step icon={UserIcon} title="Authentication">
              <p>Step 3 content</p>
            </Stepper.Step>
            <Stepper.Step icon={UserIcon} title="Parameters">
              <p>Step 4 content</p>
            </Stepper.Step>
          </Stepper>
        </PreviewBox>
      </Preview>
    </>
  );
}
