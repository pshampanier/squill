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
        <PreviewBox className="flex text-sm text-gray-500 h-[500px]">
          <Stepper>
            <Stepper.Step name="driver" icon={WrenchIcon} title="Choose Driver" visible>
              <p>Step 1 content</p>
            </Stepper.Step>
            <Stepper.Step name="connection" icon={StarIcon} title="Connection" visible>
              <p>Step 2 content</p>
            </Stepper.Step>
            <Stepper.Step name="auth" icon={UserIcon} title="Authentication" visible>
              <p>Step 3 content</p>
            </Stepper.Step>
            <Stepper.Step name="params" icon={UserIcon} title="Parameters" visible>
              <p>Step 4 content</p>
            </Stepper.Step>
          </Stepper>
        </PreviewBox>
      </Preview>
    </>
  );
}
