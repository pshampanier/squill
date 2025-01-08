import cx from "classix";
import Button from "@/components/core/Button";
import BellIcon from "@/icons/bell.svg?react";
import BellIconActive from "@/icons/bell-active.svg?react";
import Toast from "@/components/core/Toast";
import { autoUpdate, FloatingPortal, offset, useFloating } from "@floating-ui/react";
import { memo, useCallback, useState } from "react";
import { sanitizeMessage } from "@/utils/errors";

const DEFAULT_AUTO_DISMISS_SECONDS = 30;
const DEFAULT_MAX_NOTIFICATIONS = 5;
const SHORT_AUTO_DISMISS_SECONDS = 2;
const NO_NOTIFICATION_ID = "no-notification";

type CommonNotificationProps = {
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
   * An additional message to display in the notification.
   */
  description?: string | Error | unknown;

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

type NotificationIconButtonProps = CommonNotificationProps & {
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
}: NotificationIconButtonProps) {
  const [open, setOpen] = useState(false);

  // Setup of the notification popup using Floating UI
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(5)],
    open: open,
    placement: "bottom-end",
    strategy: "absolute",
    whileElementsMounted: autoUpdate,
    nodeId: "portal-notification-popup",
  });

  const toggleOpen = () => {
    setOpen(!open);
  };

  const handleDismissNotification = (id: string) => {
    if (id !== NO_NOTIFICATION_ID) {
      onDismiss?.(id);
    }
    if (open && notifications.length <= 1) {
      // If we dismiss the last notification (or the no-notification message), we need to close the notification popup.
      toggleOpen();
    }
  };

  // There might be several `NotificationIconButton` components in the application but only one is expected to be
  // visible at a given point of time.
  // The notification popup should be displayed only for the visible `NotificationIconButton` component, otherwise
  // notification popups will be displayed in unexpected places.
  let hiddenParent = refs.domReference.current?.parentElement;
  while (hiddenParent) {
    const computedStyles = getComputedStyle(hiddenParent);
    if (computedStyles.display === "none" || computedStyles.visibility === "hidden") {
      break;
    }
    hiddenParent = hiddenParent.parentElement;
  }

  // Build the list of notifications to display.
  // If the notification popup is closed, we only display the notifications that have not been displayed yet and not
  // flagged as silent.
  // Notifications are displayed in reverse order so that the newest notification is always displayed at the top.
  let filteredNotifications: Notification[];
  if (hiddenParent) {
    // If the parent element of the notification icon is hidden, we don't display any notification.
    filteredNotifications = [];
  } else if (open && notifications.length) {
    // If the notification popup is open, we display the last `max` notifications.
    filteredNotifications = Array.from(notifications).reverse().slice(0, max);
  } else if (open) {
    // If the notification popup is open but there are no notifications, we display a special message
    filteredNotifications = [
      {
        id: NO_NOTIFICATION_ID,
        variant: "info",
        message: "No new notifications",
        displayed: false,
        autoDismiss: true,
      },
    ];
  } else {
    // If the notification popup is closed, we display the last `max` notifications that have not been displayed yet
    filteredNotifications = notifications
      .filter((n) => !n.silent && !n.displayed)
      .reverse()
      .slice(0, max);
  }

  // The icon of the notification button
  const Icon = notifications.length === 0 ? BellIcon : BellIconActive;

  const classes = {
    self: cx("relative inline-flex items-center", className),
    badge: cx(
      "absolute h-3 w-3 right-2 top-2 rounded-full border-white flex justify-center text-3xs items-center items border-2",
      "cursor-pointer bg-red-600 dark:bg-red-600",
    ),
  };

  console.debug("NotificationIconButton", { open, size: notifications.length, floatingStyles, hidden: !!hiddenParent });
  return (
    <>
      <span data-component="notification-icon-button" ref={refs.setReference} className={classes.self}>
        <Button icon={Icon} tooltip="Notifications" onClick={toggleOpen} />
        {notifications.length > 0 && (
          <span className={classes.badge}>
            <span>{notifications.length > 9 ? "∞" : notifications.length}</span>
          </span>
        )}
      </span>
      {filteredNotifications.length > 0 && (
        <NotificationPopup
          isOpen={open}
          notifications={filteredNotifications}
          onDismiss={handleDismissNotification}
          onDisplayed={onDisplayed}
          autoDismissSeconds={autoDismissSeconds}
          floatingStyles={floatingStyles}
          setFloating={refs.setFloating}
        />
      )}
    </>
  );
}

type NotificationPopupProps = CommonNotificationProps & {
  /**
   * A flag indicating if the popup display is the result of the user opening it or displaying new notifications.
   */
  isOpen: boolean;

  /**
   * The list of notifications to display.
   */
  notifications: Notification[];

  /**
   * The styles to apply to the floating element (floating-ui internal prop)
   */
  floatingStyles: React.CSSProperties;

  /**
   * A function to set the floating element (floating-ui internal prop).
   */
  setFloating(node: HTMLElement | null): void;
};

const NotificationPopup = memo(
  function NotificationPopup({
    isOpen,
    notifications,
    onDismiss,
    onDisplayed,
    floatingStyles,
    autoDismissSeconds,
    setFloating,
  }: NotificationPopupProps) {
    // The special notification displayed when there are no notifications has a shorter auto dismiss time.
    // This function will return undefined when the notification is not expected to be dismissed automatically.
    const getAutoDismissSeconds = useCallback(
      (notification: Notification) => {
        if (notification.id === NO_NOTIFICATION_ID) {
          return SHORT_AUTO_DISMISS_SECONDS;
        } else if (notification.autoDismiss || !isOpen) {
          return autoDismissSeconds;
        }
      },
      [isOpen, autoDismissSeconds],
    );

    const count = notifications.length;
    const classes = cx("flex flex-col items-center bg-transparent", count === 0 && "hidden");

    console.debug("NotificationPopup", {
      count,
      isOpen,
      transform: floatingStyles.transform,
      autoDismissSeconds,
    });
    return (
      <FloatingPortal id="notification-popup">
        <div ref={setFloating} style={{ ...floatingStyles }} className={classes}>
          {notifications.map((ntf) => (
            <Toast
              key={ntf.id}
              variant={ntf.variant}
              message={ntf.message}
              description={sanitizeMessage(ntf.description)}
              onDismiss={() => onDismiss(ntf.id)}
              onDisplayed={() => (ntf.autoDismiss ? onDismiss(ntf.id) : onDisplayed?.(ntf.id))}
              displaySeconds={getAutoDismissSeconds(ntf)}
              icon={true}
            />
          ))}
        </div>
      </FloatingPortal>
    );
  },
  (prev, next) =>
    prev.isOpen == next.isOpen &&
    prev.notifications.length == next.notifications.length &&
    prev.notifications.every((n, i) => n.id === next.notifications[i].id) &&
    prev.autoDismissSeconds === next.autoDismissSeconds &&
    prev.floatingStyles.transform === next.floatingStyles.transform,
);
