import cx from "classix";
import { useCallback, useEffect, useRef } from "react";
import { primary as colors } from "@/utils/colors";
import { CommandEvent } from "@/utils/commands";
import { useCommand } from "@/hooks/use-commands";

export type ModalProps = {
  children?: React.ReactNode;
  onClose?: () => void;
  onCancel?: () => void;
  className?: string;
};

export default function Modal({ onClose, onCancel, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    // IMPORTANT: The following code is a hack to make the notification popup appear in front of the dialog.
    // This code implies that the root element of the application is the element with the id "root" and the
    // notification popup is the element with the id "notification-popup".
    // When the modal is closed, the notification popup is moved back to root element in the DOM.
    const portals = ["notification-popup", "dropdown-popup"].map((n) => document.getElementById(n)).filter((p) => p);
    portals.forEach((portal) => dialogRef.current?.appendChild(portal));
    return () => {
      const root = document.getElementById("root");
      portals.forEach((portal) => root.appendChild(portal));
    };
  });

  const classes = cx(
    "text-left align-middle bg-white rounded-lg shadow-xl",
    "outline-none",
    colors("text", "background"),
    className,
  );

  //  const handleKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {};

  //
  // Command handling
  //
  const handleCommand = useCallback(
    (event: CommandEvent) => {
      if (event.detail.name === "close") {
        onCancel?.();
        event.stopPropagation();
      }
    },
    [onCancel],
  );
  useCommand({ ref: dialogRef, onCommand: handleCommand });

  return (
    <dialog ref={dialogRef} onClose={onClose} className={classes}>
      {children}
    </dialog>
  );
}
