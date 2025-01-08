import { Notification } from "@/components/core/NotificationInbox";
import NotificationIconButton from "@/components/core/NotificationInbox";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import Toast from "@/components/core/Toast";
import Space from "@/components/spaces/Space";
import Titlebar from "@/components/titlebar/Titlebar";
import React from "react";
import Button from "@/components/core/Button";

export default function ToastPreview() {
  const nextId = React.useRef(1);
  const [notifications, setNotifications] = React.useState<Notification[]>([
    { id: `id-${nextId.current++}`, variant: "success", message: `Message ${nextId.current}`, displayed: true },
    { id: `id-${nextId.current++}`, variant: "success", message: `Message ${nextId.current}`, displayed: true },
    { id: `id-${nextId.current++}`, variant: "success", message: `Message ${nextId.current}`, displayed: true },
    { id: `id-${nextId.current++}`, variant: "success", message: `Message ${nextId.current}`, displayed: true },
    { id: `id-${nextId.current++}`, variant: "success", message: `Message ${nextId.current}`, displayed: true },
    { id: `id-${nextId.current++}`, variant: "success", message: `Message ${nextId.current}`, displayed: true },
  ]);

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationDisplayed = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, displayed: true } : n)));
  };

  return (
    <>
      <Preview>
        <Preview.Title>Toast Container</Preview.Title>
        <Preview.Description>
          Toast have 4 variants: <b>info</b> (default), <b>success</b>, <b>warning</b> and <b>error</b>.
        </Preview.Description>
        <PreviewBox className="flex flex-col space-y-2">
          <Space>
            <Titlebar className="rounded">
              <Titlebar.AppName />
              <NotificationIconButton
                notifications={notifications}
                onDismiss={handleDismissNotification}
                onDisplayed={handleNotificationDisplayed}
              />
            </Titlebar>
          </Space>
          <div className="flex flex-row space-x-2">
            <Button
              variant="outline"
              text="Add"
              onClick={() =>
                setNotifications((prev) => [
                  ...prev,
                  {
                    id: `id-${nextId.current++}`,
                    variant: "success",
                    message: `Message ${nextId.current}`,
                  },
                ])
              }
            />
            <Button
              variant="outline"
              text="Add Silent"
              onClick={() =>
                setNotifications((prev) => [
                  ...prev,
                  {
                    id: `id-${nextId.current++}`,
                    variant: "info",
                    message: `Message ${nextId.current}`,
                    silent: true,
                  },
                ])
              }
            />
            <Button
              variant="outline"
              text="Add AutoDismiss"
              onClick={() =>
                setNotifications((prev) => [
                  ...prev,
                  {
                    id: `id-${nextId.current++}`,
                    variant: "warning",
                    message: `Message ${nextId.current}`,
                    autoDismiss: true,
                  },
                ])
              }
            />
          </div>
        </PreviewBox>
      </Preview>
      {/*
       * Variants
       */}
      <Preview>
        <Preview.Title>Variants</Preview.Title>
        <Preview.Description>
          Toast have 4 variants: <b>info</b> (default), <b>success</b>, <b>warning</b> and <b>error</b>.
        </Preview.Description>
        <PreviewBox>
          <Toast variant="info" message="This is an info message." />
          <Toast variant="success" message="This is a success message." />
          <Toast variant="warning" message="This is a warning message." />
          <Toast variant="error" message="This is an error message." />
          <Toast
            variant="info"
            message="This is an info message with description."
            description="This is the description."
          />
        </PreviewBox>
      </Preview>
    </>
  );
}
