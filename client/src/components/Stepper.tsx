import cx from "classix";
import { primary, secondary } from "@/utils/colors";
import { SVGIcon } from "@/utils/types";
import Button from "@/components/core/Button";
import ChevronIcon from "@/icons/chevron-right.svg?react";

import React, { SyntheticEvent } from "react";

type StepperProps = {
  /**
   * The text to display on the "Done" button.
   */
  doneButtonText?: string;
  onCompleted?: (event: SyntheticEvent) => void;
  onCanceled?: (event: SyntheticEvent) => void;

  /**
   * The steps of the stepper.
   */
  children: React.ReactNode;
};

Stepper.defaultProps = {
  doneButtonText: "Done",
};

/**
 * The Stepper component is a navigation component that allows users to navigate through a series of steps.
 *
 * It is composed of a navigation bar and a main view.
 * The navigation bar displays the steps and their status.
 * The main view displays the content of the current step.
 *
 * ```
 *
 *                                              │Stepper
 *                                              │
 *                 ┌────────────────────────────■──────┐
 *                 │ ┌────────────┐ ┌───────────────┬ ─│─ ─ ─ ─ ─ ─ ┬ ─ ─ ─ ─ ─ ─ ─ ┐
 *                 │ │ ┌────────┐ │ │               │  │
 *  NavStep (1) ───┼─┼─■        │ │ │               │  │            │               │
 *                 │ │ └────────┘ │ │               │  │
 *                 │ │ ┌────────┐ │ │               │  │            │               │
 *  NavStep (2) ───┼─┼─■        │ │ │               │  │
 *                 │ │ └────────┘ │ │               │  │            │               │
 *                 │ │ ┌────────┐ │ │               │  │
 *  NavStep (3) ───┼─┼─■        │ │ │               │  │            │               │
 *                 │ │ └────────┘ │ │               │  │
 *                 │ └────────────┘ └────────■──────┴ ─│─ ─■─ ─ ─ ─ ┴ ─ ─■─ ─ ─ ─ ─ ┘
 *                 └─────────────────────────┼─────────┘   │             │
 *                                           │             │             │
 *                                           │ Step (1)    │ Step (2)    │ Step (3)
 * ```
 */
function Stepper({ children, doneButtonText, onCanceled, onCompleted }: StepperProps) {
  // The last step that is completed
  const [completedStep, setCompletedStep] = React.useState(0);

  // The current step that is active
  const [activeStep, setActiveStep] = React.useState(1);

  // The total number of steps
  let stepsCount = 0;

  // The props of the active step
  let activeStepProps: StepProps = null;

  // Create the navigation bar. For each child, we create a NavStep component.
  const navChildren = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child)) {
      stepsCount++;
      const step = index + 1;
      const props: NavStepProps = {
        step,
        title: child.props.title,
        icon: child.props.icon,
        status: step <= completedStep ? "completed" : step === completedStep + 1 ? "in-progress" : "upcoming",
        completedStep,
        active: step === activeStep,
        count: stepsCount,
        onChange: (step) => setActiveStep(step),
      };
      if (step === activeStep) {
        activeStepProps = child.props;
      }
      return <NavStep key={index + 1} {...props} />;
    }
  });

  // Click on the "Back" button
  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Click on the "Cancel" button
  const handleCancel = (event: SyntheticEvent) => {
    onCanceled?.(event);
  };

  // Click on the "Next/Done" button
  const handleNext = (event: SyntheticEvent) => {
    activeStepProps.onSubmit?.(event, activeStepProps.name);
    if (!event.defaultPrevented) {
      // The event was not prevented, so we can proceed to the next step
      if (activeStep === completedStep + 1) {
        setCompletedStep((prev) => prev + 1);
      }
      // If the active step is not the last one, we move to the next step otherwise we call the onCompleted callback
      if (activeStep < stepsCount) {
        setActiveStep((prev) => prev + 1);
      } else {
        onCompleted?.(event);
      }
    }
  };

  // The offset of the main view
  // Only one step is visible at a time, so we move the main view to the left by 100% for each step.
  // ```
  //                                               ╔════════════════════════╗
  //                                               ║ activeStep = 3         ║
  //                                         ┏━━━━ ║ mainViewOffset = -200% ║
  //                                         ┃     ╚════════════════════════╝
  //                                         ┃
  //                                         ▼
  // ┌ ─ ─ ─ ─ ─ ─ ─ ┬ ─ ─ ─ ─ ─ ─ ─ ┬───────────────┬ ─ ─ ─ ─ ─ ─ ─ ┐
  //                                 │               │
  // │               │               │               │               │
  //                                 │               │
  // │               │               │               │               │
  //                                 │               │
  // │               │               │               │               │
  //                                 │               │
  // │               │               │               │               │
  //                                 │               │
  // └ ─ ─ ─ ─■─ ─ ─ ┴ ─ ─ ─■─ ─ ─ ─ ┴────■──────────┴ ─ ─■─ ─ ─ ─ ─ ┘
  //          │             │             │               │
  //          │             │             │               │
  //          │ Step (1)    │ Step (2)    │ Step (3)      │ Step (4)
  // ```
  const mainViewOffset = `-${100 * (activeStep - 1)}%`;

  return (
    <div className="flex flex-row w-full h-full space-x-4">
      <nav className={cx("flex w-1/4 min-w-fit rounded p-8", secondary("background"))}>
        <ul className="w-full">{navChildren}</ul>
      </nav>
      <div className="flex flex-col w-3/4">
        <div className="flex flex-row w-full">
          <Button className="space-x-2" onClick={handleBack} disabled={activeStep === 1}>
            <ChevronIcon className="rotate-180" />
            <span>Back</span>
          </Button>
        </div>
        <div className="flex overflow-x-hidden py-4">
          <div
            className="relative flex w-full transition-all ease-in-out duration-200"
            style={{ left: mainViewOffset }}
          >
            {children}
          </div>
        </div>
        <div className={cx("flex flex-row justify-end space-x-1 border-t pt-4", primary("border"))}>
          <Button variant="outline" text="Cancel" onClick={handleCancel} />
          <Button
            variant="solid"
            disabled={completedStep === stepsCount}
            text={activeStep === stepsCount ? doneButtonText : "Next"}
            onClick={handleNext}
          />
        </div>
      </div>
    </div>
  );
}

type NavStepProps = {
  /**
   * The step number (index of the step among all steps, starts a 1).
   */
  step: number;

  /**
   * The title of the step.
   */
  title: string;

  /**
   * The icon of the step.
   */
  icon: SVGIcon;

  /**
   * The current status of the step.
   *
   *  - "completed": the step is completed.
   *  - "in-progress": the step has been active but not yet completed.
   *  - "upcoming": the step has never been active.
   */
  status: "completed" | "in-progress" | "upcoming";

  /**
   * The number of the last step that is completed.
   */
  completedStep: number;

  /**
   * Whether the step is currently active (the one currently displayed in the main view).
   */
  active: boolean;

  /**
   * The total number of steps.
   */
  count: number;

  /**
   * The callback to call when the nav step is clicked (internal use only).
   */
  onChange?: (step: number) => void;
};

/**
 * A navigation step in the Stepper component.
 *
 * It displays the step number, the title, the status and the icon of the step.
 * This component is created by the Stepper component and should not be used directly.
 */
function NavStep({ step, title, icon, status, completedStep, active, count, onChange }: NavStepProps) {
  const itemClasses = cx(
    "relative flex gap-3 w-full h-24 rounded p-2 select-none",
    secondary("hover:ghost-background", "hover:ghost-text", "text"),
    status === "upcoming" ? "pointer-events-none" : "cursor-pointer",
    status === "upcoming" && step - completedStep === 1 && "opacity-50",
    status === "upcoming" && step - completedStep === 2 && "opacity-35",
    status === "upcoming" && step - completedStep > 2 && "opacity-20"
  );
  const lineClasses = cx(
    step < count && "before:absolute before:w-[1px] before:h-11 mb-2 before:left-6 before:top-12",
    status === "completed" ? "before:bg-green-600" : "before:bg-gray-500"
  );
  const statusClasses = cx(
    "text-xs",
    status === "completed" && "text-green-600",
    status === "in-progress" && "text-blue-500",
    status === "upcoming" && "hidden"
  );
  const iconClasses = cx(
    "w-8 h-8 p-1 rounded-full border-2",
    active && "border-green-600 text-green-600 bg-white dark:bg-gray-300",
    !active && status === "completed" && "border-green-600 bg-green-600 text-white",
    status === "upcoming" && "bg-white text-gray-500 border-gray"
  );

  const handleClick = () => {
    onChange?.(step);
  };

  const Icon = icon;
  return (
    <li key={step} className={itemClasses} tabIndex={status != "upcoming" ? 0 : -1} onClick={handleClick}>
      <div className={lineClasses}>
        <Icon className={iconClasses} />
      </div>
      <div className="flex flex-col text-sm mt-1">
        <p className="opacity-80">Step {step}</p>
        <p className="mt-2 font-semibold">{title}</p>
        <p className={statusClasses}>{status === "in-progress" ? "In progress..." : "Completed"}</p>
      </div>
    </li>
  );
}

type StepProps = {
  icon: SVGIcon;
  title: string;
  children: React.ReactNode;
  name?: string;
  onSubmit?: (event: SyntheticEvent, name?: string) => void;
};

function Step({ children }: StepProps) {
  return <section className="flex-shrink-0 w-full justify-center items-center">{children}</section>;
}

Stepper.Step = Step;
export default Stepper;
