import cx from "classix";
import { primary, secondary } from "@/utils/colors";
import { SVGIcon } from "@/utils/types";
import Button from "@/components/core/Button";
import ChevronIcon from "@/icons/chevron-right.svg?react";

import React, { SyntheticEvent, createContext } from "react";
import { raise } from "@/utils/telemetry";

type StepperProps = {
  /**
   * The text to display on the "Done" button.
   */
  doneButtonText?: string;
  onCompleted?: (event: SyntheticEvent) => void;
  onCancel?: (event: SyntheticEvent) => void;

  /**
   * The steps of the stepper.
   */
  children: React.ReactNode;
};

Stepper.defaultProps = {
  doneButtonText: "Done",
};

const StepperContext = createContext(null);

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
function Stepper({ children, doneButtonText, onCancel, onCompleted }: StepperProps) {
  // The last step that is completed
  const [completedStep, setCompletedStep] = React.useState(-1);

  // The current step that is active
  const [activeStep, setActiveStep] = React.useState(0);

  // Whether a transition is in progress or not
  //
  // When a transition is in progress, the main view is moved to the left by 100% for each step. During the transition
  // we want to make sure all steps are visible because 2 steps are visible at the same time (the previous step and the
  // newly active step). But one the transition is over, we want to hide all steps except the active one to prevent any
  // focus or keyboard event to be triggered on the hidden steps.
  const [transitionInProgress, setTransitionInProgress] = React.useState(false);

  const visibleChildren = React.Children.toArray(children).filter((child) => {
    if (React.isValidElement(child)) {
      return child.props.visible;
    } else {
      raise("Stepper: only Step components are allowed as children");
    }
  });

  // Get the active child (i.e. the Step that is currently displayed in the main view)
  const activeChild = (() => {
    const activeChild = visibleChildren[activeStep];
    return React.isValidElement(activeChild) ? activeChild : null;
  })();

  // Create the navigation bar. For each child, we create a NavStep component.
  const navChildren = React.Children.map(visibleChildren, (child, index) => {
    if (React.isValidElement(child)) {
      const props: NavStepProps = {
        step: index,
        title: child.props.title,
        icon: child.props.icon,
        status: index <= completedStep ? "completed" : index === completedStep + 1 ? "in-progress" : "upcoming",
        completedStep,
        active: index === activeStep,
        count: visibleChildren.length,
        onChange: (step) => setActiveStep(step),
      };
      return <NavStep key={index} {...props} />;
    }
  });

  const startTransitionTo = (step: number) => {
    setTransitionInProgress(true);
    setActiveStep(step);
  };

  // Click on the "Back" button
  const handleBack = () => {
    startTransitionTo(activeStep - 1);
  };

  // Click on the "Cancel" button
  const handleCancel = (event: SyntheticEvent) => {
    onCancel?.(event);
  };

  // Click on the "Next/Done" button
  const handleNext = (event: SyntheticEvent) => {
    activeChild.props.onSubmit?.(event, activeChild.props.name);
    if (!event.defaultPrevented) {
      // The event was not prevented, so we can proceed to the next step
      if (activeStep === completedStep + 1) {
        setCompletedStep((prev) => prev + 1);
      }
      // If the active step is not the last one, we move to the next step otherwise we call the onCompleted callback
      if (activeStep < visibleChildren.length - 1) {
        startTransitionTo(activeStep + 1);
      } else {
        onCompleted?.(event);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleNext(event);
    }
  };

  const isStepVisible = (name: string) => {
    return transitionInProgress || activeChild.props.name === name;
  };

  // The offset of the main view
  // Only one step is visible at a time, so we move the main view to the left by 100% for each step.
  // ```
  //                                               ╔════════════════════════╗
  //                                               ║ activeStep = 2         ║
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
  //          │ Step (0)    │ Step (1)    │ Step (2)      │ Step (3)
  // ```
  const mainViewOffset = `-${100 * activeStep}%`;

  return (
    <div className="flex flex-row w-full h-full" onKeyDown={handleKeyDown}>
      <nav className={cx("flex rounded py-4 w-1/4 pl-4 pr-8", secondary("background"))}>
        <ul className="w-full">{navChildren}</ul>
      </nav>
      <div className="flex flex-col w-3/4 pl-4">
        <div className="flex overflow-x-hidden">
          <div
            className="relative flex w-full transition-all ease-in-out duration-200"
            style={{ left: mainViewOffset }}
            onTransitionEnd={() => setTransitionInProgress(false)}
          >
            <StepperContext.Provider value={{ isStepVisible }}>{children}</StepperContext.Provider>
          </div>
        </div>
        <div className="mt-auto w-full">
          <div className={cx("flex flex-row border-t pt-4", primary("border"))}>
            <Button
              className="space-x-2 select-none"
              onClick={handleBack}
              disabled={activeStep === 0 || activeChild.props.disableBackNavigation}
            >
              <ChevronIcon className="rotate-180" />
              <span>Back</span>
            </Button>
            <div className="flex justify-end space-x-1 w-full">
              <Button variant="outline" text="Cancel" onClick={handleCancel} />
              <Button
                variant="solid"
                disabled={completedStep === visibleChildren.length - 1}
                text={activeStep === visibleChildren.length - 1 ? doneButtonText : "Next"}
                onClick={handleNext}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// <div className={cx("flex flex-row justify-end space-x-1 border-t pt-4", colors("border"))}>

type NavStepProps = {
  /**
   * The step number (index of the step among all steps, starts a 0).
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
   *
   * @param step The number of the step that was clicked.
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
  const classes = {
    item: cx(
      "relative flex gap-3 w-full h-24 rounded p-2 select-none",
      secondary("hover:ghost-background", "hover:ghost-text", "text"),
      status === "upcoming" ? "pointer-events-none" : "cursor-pointer",
      status === "upcoming" && step - completedStep === 1 && "opacity-50",
      status === "upcoming" && step - completedStep === 2 && "opacity-35",
      status === "upcoming" && step - completedStep > 2 && "opacity-20"
    ),
    line: cx(
      step < count - 1 && "before:absolute before:w-[1px] before:h-11 mb-2 before:left-6 before:top-12",
      status === "completed" ? "before:bg-green-600" : "before:bg-gray-500"
    ),
    status: cx(
      "text-xs",
      status === "completed" && "text-green-600",
      status === "in-progress" && "text-blue-500",
      status === "upcoming" && "hidden"
    ),
    icon: cx(
      "w-8 h-8 p-1 rounded-full border-2",
      active && "border-green-600 text-green-600 bg-white dark:bg-gray-300",
      !active && status === "completed" && "border-green-600 bg-green-600 text-white",
      status === "upcoming" && "bg-white text-gray-500 border-gray"
    ),
  };

  const handleClick = () => {
    onChange?.(step);
  };

  const Icon = icon;
  return (
    <li key={step} className={classes.item} tabIndex={status != "upcoming" ? 0 : -1} onClick={handleClick}>
      <div className={classes.line}>
        <Icon className={classes.icon} />
      </div>
      <div className="flex flex-col text-sm mt-1">
        <p className="opacity-80">Step {step + 1}</p>
        <p className="mt-2 font-semibold">{title}</p>
        <p className={classes.status}>{status === "in-progress" ? "In progress..." : "Completed"}</p>
      </div>
    </li>
  );
}

type StepProps = {
  /**
   * An icon to display in the navigation bar for the step.
   */
  icon: SVGIcon;

  /**
   * The title to display in the navigation bar for the step.
   */
  title: string;

  /**
   * The name of the step.
   *
   * This name is used to identify the step when the step is submitted.
   */
  name: string;

  /**
   * Whether the step is visible or not.
   */
  visible: boolean;

  /**
   * Whether the back navigation should be disabled for this step.
   */
  disableBackNavigation?: boolean;

  /**
   * The callback to call when the step is submitted.
   *
   * This callback is called when the "Next" button is clicked and the step is the active step.
   * The callback has the option to prevent the default behavior by calling `event.preventDefault()`.
   *
   * @param event The event originating the submit.
   * @param name The name of the step.
   */
  onSubmit?: (event: SyntheticEvent, name: string) => void;

  /**
   * The content of the step.
   */
  children: React.ReactNode;
};

Step.defaultProps = {
  visible: true,
};

function Step({ title, children, name, visible }: StepProps) {
  if (!visible) return null;
  const { isStepVisible } = React.useContext(StepperContext);
  const classes = {
    section: cx("flex-shrink-0 w-full justify-center items-center", isStepVisible(name) ? "visible" : "invisible"),
  };
  return (
    <section className={classes.section}>
      <div className="flex flex-col space-y-4">
        <h1 className={cx("font-bold text-xl", primary("heading-text"))}>{title}</h1>
        <div className="flex">{children}</div>
      </div>
    </section>
  );
}

Stepper.Step = Step;
export default Stepper;
