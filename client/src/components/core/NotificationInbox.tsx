import Button from "@/components/core/Button";
import BellIcon from "@/icons/bell.svg?react";
import BellIconActive from "@/icons/bell-active.svg?react";
import Toast from "@/components/core/Toast";
import { autoUpdate, FloatingPortal, offset, useFloating } from "@floating-ui/react";
import { useState } from "react";
import cx from "classix";

const DEFAULT_AUTO_DISMISS_SECONDS = 5;
const DEFAULT_MAX_NOTIFICATIONS = 5;
const SHORT_AUTO_DISMISS_SECONDS = 2;

export type Notification = {
  /**
   * A unique identifier for the notification.
   */
  id: string;

  /**
   * The variant of the notification.
   */
  variant: "info" | "success" | "warning" | "error";

  /**
   * The message to display in the notification.
   */
  message: string;

  /**
   * TODO: An additional message to display in the notification.
   */
  description?: string;

  /**
   * A flag indicating if the notification should be displayed to the user immediately or not.
   *
   * If true, the notification will be displayed to the user immediately.
   * If false, the notification will be displayed to the user only when the user clicks on the notification.
   */
  silent?: boolean;

  /**
   * If true, the notification will be automatically dismissed after few seconds.
   */
  autoDismiss?: boolean;

  /**
   * A flag indicating if the notification has already been displayed to the user.
   */
  displayed?: boolean;
};

type NotificationsButtonProps = {
  /**
   * Additional classes to apply to the top level element of the component.
   */
  className?: string;

  /**
   * The list of notifications to display.
   */
  notifications: Notification[];

  /**
   * The maximum number of notifications to display.
   */
  max?: number;

  /**
   * A callback function that is called when a notification is dismissed.
   */
  onDismiss?: (id: string) => void;

  /**
   * A callback function that is called once the notification popup has been displayed.
   */
  onDisplayed?: (id: string) => void;

  /**
   * Set the number of seconds after which the notification with the flag `autoDismissed` will be automatically dismissed.
   */
  autoDismissSeconds?: number;
};

/**
 * An icon button that displays a notification popup when clicked.
 *
 * The icon represent a bell overlapped with a badge that displays the number of notifications if any.
 * New notification are automatically displayed for a short period of time even if the notification popup is not open.
 */
export default function NotificationIconButton({
  max = DEFAULT_MAX_NOTIFICATIONS,
  notifications,
  autoDismissSeconds = DEFAULT_AUTO_DISMISS_SECONDS,
  className,
  onDismiss,
  onDisplayed,
}: NotificationsButtonProps) {
  const [open, setOpen] = useState(false);

  const toggleOpen = () => {
    setOpen(!open);
  };

  const handleDismissNotification = (id: string) => {
    onDismiss?.(id);
    if (open && notifications.length === 1) {
      // If we dismiss the last notification, we need to close the notification popup.
      toggleOpen();
    }
  };

  // Build the list of notifications to display.
  // If the notification popup is closed, we only display the notifications that have not been displayed yet and not
  // flagged as silent.
  // Notifications are displayed in reverse order so that the newest notification is always displayed at the top.
  let displayNotifications: Notification[];
  if (open) {
    displayNotifications = Array.from(notifications).reverse();
  } else {
    displayNotifications = notifications.filter((n) => !n.silent && !n.displayed).reverse();
  }

  // Setup of the notification popup using Floating UI
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(5)],
    open: open,
    placement: "bottom-end",
    strategy: "absolute",
    whileElementsMounted: autoUpdate,
  });

  // The icon of the notification button
  const Icon = notifications.length === 0 ? BellIcon : BellIconActive;

  const classes = {
    self: cx("relative inline-flex items-center", className),
    badge: cx(
      "absolute h-3 w-3 right-2 top-2 rounded-full border-white flex justify-center text-3xs items-center items border-2",
      "cursor-pointer bg-red-600 dark:bg-red-600",
    ),
  };

  console.debug("NotificationIconButton", { open, size: notifications.length });
  return (
    <>
      <span ref={refs.setReference} className={classes.self}>
        <Button icon={Icon} tooltip="Notifications" onClick={toggleOpen} />
        {notifications.length > 0 && (
          <span className={classes.badge}>
            <span>{notifications.length > 9 ? "∞" : notifications.length}</span>
          </span>
        )}
      </span>
      {(open || displayNotifications.length > 0) && (
        <FloatingPortal id="notification-popup">
          <div ref={refs.setFloating} style={{ ...floatingStyles }} className="bg-transparent">
            <div className="flex flex-col items-center bg-transparent">
              {notifications.length === 0 ? (
                <Toast
                  key={Math.random()}
                  variant="info"
                  message="No new notifications"
                  onDismiss={() => toggleOpen()}
                  onDisplayed={() => toggleOpen()}
                  icon={BellIcon}
                  displaySeconds={SHORT_AUTO_DISMISS_SECONDS}
                />
              ) : (
                displayNotifications
                  .slice(0, max)
                  .map((ntf) => (
                    <Toast
                      key={ntf.id}
                      variant={ntf.variant}
                      message={ntf.message}
                      onDismiss={() => handleDismissNotification(ntf.id)}
                      onDisplayed={() => (ntf.autoDismiss ? handleDismissNotification(ntf.id) : onDisplayed?.(ntf.id))}
                      displaySeconds={!open && !ntf.displayed ? autoDismissSeconds : undefined}
                      icon={true}
                    />
                  ))
              )}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
