import { addTime, formatRelativeDate, truncDate } from "@/utils/time";
import { useEffect, useState } from "react";

/**
 * Displays when the query was executed, as a date or a relative period of time such as 'yesterday', '1 hour ago', etc.
 *
 * The display value is updated every minute, hour, or day as needed.
 */
export default function RelativeDate({ date, fnNow = () => new Date() }: { date: Date; fnNow?: () => Date }) {
  const [displayValue, setDisplayValue] = useState<string>("");
  useEffect(() => {
    let refreshInterval: number; // number of milliseconds when the display value should be refreshed.
    const now = fnNow();
    const [text, precision] = formatRelativeDate(date, { currentDate: now });
    switch (precision) {
      case "day": {
        // Because the text can be 'yesterday', we need to refresh the value every day.
        refreshInterval = addTime(truncDate(now, "day"), 1, "day").getTime() - now.getTime();
        break;
      }
      case "hour": {
        // 'x hours ago', we need to refresh the value every minute.
        refreshInterval = 60 * 1000;
        break;
      }
      case "minute":
      case "second": {
        // 'x minutes ago' or 'x seconds ago', we need to refresh the value every second.
        refreshInterval = 1000;
        break;
      }
    }
    const interval = setInterval(() => {
      // When it's time to refresh the value, we reset the display value to trigger a re-render.
      // This will not cause a flicker because the new value is set immediately after.
      setDisplayValue("");
    }, refreshInterval);
    setDisplayValue(text);
    return () => clearInterval(interval);
  }, [displayValue]);
  return <span>{displayValue}</span>;
}
