import Alert from "@/components/core/Alert";
import Button from "@/components/core/Button";

type ErrorMessageProps = {
  message: string | Error;
  className?: string;
  onClose?: () => void;
};

/**
 * A component that displays an error message.
 */
export default function ErrorMessage({ message, className, onClose }: ErrorMessageProps) {
  // const [showDetails, setShowDetails] = useState(false);
  const errorMessage = message instanceof Error ? message.message : message;
  return (
    <Alert title={true} icon={true} severity="danger" border="outline" className={className}>
      <p>{errorMessage}</p>
      <Button onClick={onClose} className="mt-4 ml-auto" variant="solid" text="Close" />
    </Alert>
  );
}
