import { useUserStore } from "@/stores/UserStore";
import NotificationIconButton from "@/components/core/NotificationInbox";

/**
 * A button that displays the number of notifications and allows the user to dismiss them.
 */
export default function UserNotificationIconButton() {
  const notifications = useUserStore((state) => state.notifications);
  const dismissNotification = useUserStore((state) => state.removeNotification);

  return <NotificationIconButton notifications={notifications} onDismiss={dismissNotification} />;
}
