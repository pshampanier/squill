import cx from "classix";
import CrashedImage from "@/icons/crashed.svg?react";
import UserErrorMessage from "@/components/core/UserErrorMessage";
import Spinner from "@/components/core/Spinner";
import Button from "@/components/core/Button";
import { useEffect, useState } from "react";

type LoadingContainerProps = {
  /**
   * Additional classes to apply to the top element of the component.
   */
  className?: string;

  /**
   * The message to be displayed while loading.
   */
  message: string;

  /**
   * The status of the loading container.
   *
   * - "pending": The container is not visible.
   * - "running": The container is visible and shows a spinner.
   * - "error": The container is visible and shows an error message.
   * - "success": The container is not visible.
   */
  status: "pending" | "running" | "error" | "success";

  /**
   * The error that occurred if the status is "error".
   */
  error?: Error;

  /**
   * A fallback message to display when the `error` is not a `UserError`.
   */
  errorFallback: string;

  /**
   * A function to be called when the user clicks the retry button.
   */
  onRetry: () => void;

  /**
   * The size of container.
   */
  size?: "sm" | "md" | "lg" | "xl";
};

/**
 * A container that displays a loading spinner and a message while loading.
 *
 * The containers starts as transparent and displays a spinner after 200ms and a message after 1 second
 * If an error occurs, it displays an error message and a retry button.
 */
export default function LoadingContainer({
  className,
  message,
  status,
  error,
  errorFallback,
  onRetry,
  size = "xl",
}: LoadingContainerProps) {
  // Show the message after 1 second
  const [showMessage, setShowMessage] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMessage(true);
    }, 1000 /* 1 second */);
    return () => clearTimeout(timer); // cleanup on unmount
  }, []);

  const classes = {
    self: cx(
      "bg-transparent w-full h-full",
      size === "sm" && "text-2xs",
      size === "md" && "text-xs",
      size === "lg" && "text-sm",
      size === "xl" && "text-md",
      className,
    ),
    running: cx(
      "flex flex-col bg-transparent w-full h-full items-center  justify-center",
      status !== "running" && "hidden",
    ),
    error: cx(
      "flex flex-col bg-transparent w-full h-full items-center justify-center",
      status !== "error" && "hidden",
      status === "error" ? "transition-opacity duration-1000 opacity-100" : "opacity-0",
    ),
  };

  if (status === "pending" || status === "success") {
    return null;
  } else {
    return (
      <div className={classes.self}>
        {status === "running" && (
          <div className={classes.running}>
            <Spinner size={size} delay={200} />
            <div className="flex h-8 w-full items-center justify-center">
              <span className={cx("transition-opacity duration-500", showMessage ? "opacity-100" : "opacity-0")}>
                {message}
              </span>
            </div>
          </div>
        )}
        <div className={classes.error}>
          <CrashedImage className="w-40 h-40 opacity-20" />
          <div className="flex flex-col font-semibold w-full items-center space-y-3">
            <UserErrorMessage error={error} fallback={errorFallback} />
            <Button onClick={onRetry} variant="outline" text="Retry" className="flex px-8 justify-center" />
          </div>
        </div>
      </div>
    );
  }
}
