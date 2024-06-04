import { UserError } from "@/utils/errors";

type Props = {
  /**
   * Additional classes to apply to the component.
   */
  className?: string;

  /**
   * The error that occurred.
   */
  error: Error;

  /**
   * The fallback message to display when the error is not a UserError.
   */
  fallback: string;
};

/**
 * A component that displays an Error.
 *
 * The error message is displayed only if the error is an instance of UserError, otherwise the fallback message is
 * displayed.
 */
export default function UserErrorMessage({ className, error, fallback }: Props) {
  return <span className={className}>{error instanceof UserError ? error.message : fallback}</span>;
}
