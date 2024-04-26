import Button from "@/components/core/Button";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import Modal from "@/components/Modal";
import { useState } from "react";
import FolderIcon from "@/icons/folder.svg?react";

export default function ModalPreview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Preview className="h-80">
        <Preview.Title>Modal</Preview.Title>
        <Preview.Description>
          The Stepper component is a navigation component that allows users to navigate through a series of steps.
        </Preview.Description>
        <PreviewBox className="flex items-center">
          <Button variant="solid" onClick={() => setOpen(true)} text="Show Modal" />
          {open && (
            <Modal className="w-64" onClose={() => setOpen(false)}>
              <div>
                <div className="flex items-center justify-center">
                  <FolderIcon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="mt-2 text-center">
                  <h3
                    className="text-lg font-medium leading-6 text-gray-800 capitalize dark:text-white"
                    id="modal-title"
                  >
                    Archive Project
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    If my calculations are correct, when this baby hits 88 miles per hour, you&apos;re gonna see some
                    serious sh*t.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-center">
                <Button variant="solid" text="Archive" onClick={() => setOpen(false)} />
              </div>
            </Modal>
          )}
        </PreviewBox>
      </Preview>
    </>
  );
}
