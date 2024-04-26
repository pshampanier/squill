import cx from "classix";
import { useEffect, useRef } from "react";
import { primary as colors } from "@/utils/colors";

export type ModalProps = {
  children?: React.ReactNode;
  onClose?: () => void;
  onCancel?: () => void;
  className?: string;
};

export default function Modal({ onClose, onCancel, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }
  });

  const classes = cx(
    "relative inline-block px-4 pt-5 pb-4 overflow-hidden",
    "text-left align-middle bg-white rounded-lg shadow-xl",
    "outline-none",
    "backdrop:bg-gray-900/50",
    colors("text", "background"),
    className
  );

  return (
    <dialog ref={dialogRef} onClose={onClose} onCancel={onCancel} className={classes}>
      {children}
    </dialog>
  );
}
