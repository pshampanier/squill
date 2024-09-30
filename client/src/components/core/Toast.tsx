import { SVGIcon } from "@/utils/types";
import WarningIcon from "@/icons/exclamation-triangle.svg?react";
import InfoIcon from "@/icons/information-circle.svg?react";
import MessageIcon from "@/icons/exclamation-circle.svg?react";
import SuccessIcon from "@/icons/check-circle.svg?react";
import DismissIcon from "@/icons/close.svg?react";
import { primary as colors } from "@/utils/colors";
import cx from "classix";
import React, { useEffect, useRef } from "react";

export type ToastVariant = "info" | "success" | "warning" | "error";

export type ToastProps = {
  /**
   * Additional classes to apply to the top level element of the component.
   */
  className?: string;

  /**
   * The variant of the toast.
   */
  variant: ToastVariant;

  /**
   * The message to display in the toast.
   */
  message: string;

  /**
   * A function that will be called when the user clicks on the close button.
   */
  onDismiss?: () => void;

  /**
   * A callback function that is called once the toast has been displayed.
   * The callback is only called once the toast was automatically hidden, if the toast was dismissed manually, then this
   * callback will not be called and only the onDismiss callback will be called.
   */
  onDisplayed?: () => void;

  /**
   * If true, the default icon of the variant will be displayed.
   * If false, no icon will be displayed.
   * Otherwise, the provided icon will be displayed.
   */
  icon?: boolean | SVGIcon;

  /**
   * If set, the toast will be automatically hidden after the given number of seconds.
   * Then the onDisplayed callback will be called if provided.
   */
  displaySeconds?: number;
};

/**
 * Toast are non-blocking notification popup used to provide users with feedback.
 */
export default function Toast({
  variant = "info",
  message,
  icon = true,
  onDismiss,
  onDisplayed,
  className,
  displaySeconds,
}: ToastProps) {
  const toastRef = React.useRef<HTMLDivElement>(null);

  // The callback to be called when the toast is removed from the DOM.
  // It might be the `onDisplayed` or `onDismiss` callback depending on the reason the toast was removed.
  const displayEndCallback = useRef<() => void>();

  const Icon = (() => {
    if (typeof icon !== "boolean") {
      return icon;
    } else if (typeof icon === "boolean" && icon === true) {
      return {
        info: InfoIcon,
        success: SuccessIcon,
        warning: WarningIcon,
        error: MessageIcon,
      }[variant];
    } else {
      return null;
    }
  })();

  const handleDisplayEnd = () => {
    // There are multiple transitions started by adding the closing class but we need call onDismiss only once.
    // To keep it simple, all transitions have the same duration and delay so we can just call onDismiss after the
    // the first transition ends and we remove the listener to avoid calling onDismiss multiple times.
    toastRef.current?.removeEventListener("transitionend", handleDisplayEnd);
    displayEndCallback.current?.();
  };

  const handleClose = (callback: () => void) => {
    displayEndCallback.current = callback;
    toastRef.current?.addEventListener("transitionend", handleDisplayEnd);
    toastRef.current?.classList.add("closing");
  };

  // Automatically dismiss the toast after the given number of seconds if autoDismiss is set.
  useEffect(() => {
    if (displaySeconds) {
      const timer = setTimeout(() => {
        // If a callback was already set, this means that the toast was dismissed manually and we don't need to call
        // the onDisplayed callback since onDismiss has precedence.
        !displayEndCallback.current && handleClose(onDisplayed);
      }, displaySeconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [displaySeconds]);

  const classes = {
    self: cx(
      "toast slide-in flex flex-row items-center text-xs justify-center space-x-2 rounded p-3 min-w-80 max-w-md border shadow-md mt-2",
      colors("background", "text", "border"),
      className,
    ),
    icon: cx(
      "flex shrink-0 w-6 h-6",
      variant === "info" && colors("info:text"),
      variant === "success" && colors("success:text"),
      variant === "warning" && colors("warning:text"),
      variant === "error" && colors("danger:text"),
    ),
    dismiss: cx(
      "flex w-5 h-5 flex grow-0 ml-auto rounded cursor-pointer shrink-0 items-center justify-center",
      colors("hover:ghost-background"),
    ),
  };

  return (
    <div ref={toastRef} className={classes.self}>
      {Icon && <Icon className={classes.icon} />}
      <div className="flex grow items-center">
        <div className="text-sm font-semibold">{message}</div>
        <button className={classes.dismiss}>
          <DismissIcon className="w-4 h-4" onClick={() => handleClose(onDismiss)} />
        </button>
      </div>
    </div>
  );
}
