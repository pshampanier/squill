import { Locale } from "@/utils/types";

export const SECONDS_IN_A_MINUTE: number = 60;
export const SECONDS_IN_A_HOUR: number = 60 * SECONDS_IN_A_MINUTE;
export const SECONDS_IN_A_DAY: number = 24 * SECONDS_IN_A_HOUR;
export const MILLISECONDS_IN_A_SECOND: number = 1000;
export const MILLISECONDS_IN_A_MINUTE: number = SECONDS_IN_A_MINUTE * MILLISECONDS_IN_A_SECOND;
export const MILLISECONDS_IN_A_HOUR: number = SECONDS_IN_A_HOUR * MILLISECONDS_IN_A_SECOND;
export const MILLISECONDS_IN_A_DAY: number = SECONDS_IN_A_DAY * MILLISECONDS_IN_A_SECOND;
export const MICROSECONDS_IN_A_MILLISECOND: number = 1000;
export const MICROSECONDS_IN_A_SECOND: number = 1000000;
export const MICROSECONDS_IN_A_MINUTE: number = SECONDS_IN_A_MINUTE * MICROSECONDS_IN_A_SECOND;
export const MICROSECONDS_IN_A_HOUR: number = SECONDS_IN_A_HOUR * MICROSECONDS_IN_A_SECOND;
export const MICROSECONDS_IN_A_DAY: number = SECONDS_IN_A_DAY * MICROSECONDS_IN_A_SECOND;

export type TimeUnit = "year" | "month" | "day" | "hour" | "minute" | "second" | "millisecond" | "microsecond";

/**
 * Add the specified value to the date.
 *
 * @param date The date to which the value will be added.
 * @param value The value to add (unit depends on the `unit` parameter).
 * @param unit The unit of the value to add.
 * @returns A mew date with the value added. Because the unit "microsecond" is not supported by the `Date`
 *          object, adding microseconds will be done by adding only the milliseconds part of the given `value`.
 */
export function addTime(date: Date, duration: number, unit: TimeUnit): Date {
  const newDate = new Date(date);
  switch (unit) {
    case "microsecond":
      newDate.setMilliseconds(date.getMilliseconds() + duration / MICROSECONDS_IN_A_MILLISECOND);
      break;
    case "millisecond":
      newDate.setMilliseconds(date.getMilliseconds() + duration);
      break;
    case "second":
      newDate.setSeconds(date.getSeconds() + duration);
      break;
    case "minute":
      newDate.setMinutes(date.getMinutes() + duration);
      break;
    case "hour":
      newDate.setHours(date.getHours() + duration);
      break;
    case "day":
      newDate.setDate(date.getDate() + duration);
      break;
    case "month":
      newDate.setMonth(date.getMonth() + duration);
      break;
    case "year":
      newDate.setFullYear(date.getFullYear() + duration);
      break;
  }
  return newDate;
}

/**
 * Returns a date truncated to the unit specified by the `unit`.
 */
export function truncDate(date: Date, unit: TimeUnit): Date {
  /* eslint-disable no-fallthrough */
  const truncatedDate = new Date(date);
  switch (unit) {
    case "year":
      truncatedDate.setMonth(0);
    case "month":
      truncatedDate.setDate(1);
    case "day":
      truncatedDate.setHours(0);
    case "hour":
      truncatedDate.setMinutes(0);
    case "minute":
      truncatedDate.setSeconds(0);
    case "second":
      truncatedDate.setMilliseconds(0);
    case "millisecond":
    case "microsecond":
    /* Do nothing */
  }
  return truncatedDate;
  /* eslint-enable no-fallthrough */
}

/**
 * Format styles used by {@link formatDuration} to display a human-readable representation of a duration.
 *
 * - `short`: Abbreviated format (ex: 2d 5h 3m)
 * - `long`: Full format (ex: 2 days 5 hours 3 minutes)
 * - `mixed`: The style is determined by the duration. The first part of the duration will be displayed in long format
 *            and the remaining parts in short format (ex: 2 days 5h 3m)
 */
export type FormatDurationStyle = "short" | "long" | "mixed";
export type FormatDurationPrecision = Exclude<TimeUnit, "year" | "month">;
export type FormatDurationOptions = {
  style?: FormatDurationStyle;
  locale?: Locale;
  precision?: FormatDurationPrecision;
};

/**
 * Format a duration in microseconds to a human-readable string.
 *
 * The duration is formatted in the largest unit possible, while keeping the precision specified in the options.
 *
 * @param microseconds A positive integer representing the duration in microseconds
 * @param options Options to customize the output. The default options are `{ style: "mixed", locale: "en-US" }`.
 * @returns A tuple containing the formatted duration and the precision of the last part of the duration. For instance
 *         `formatDuration(3661000000)` returns `["1 hour 1 minute", "minute"]`.
 */
export function formatDuration(
  microseconds: number,
  options?: FormatDurationOptions
): [string, FormatDurationPrecision] {
  const locales = {
    "en-US": {
      long: {
        day: ["day", "days"],
        hour: ["hour", "hours"],
        minute: ["minute", "minutes"],
        second: ["second", "seconds"],
        millisecond: ["millisecond", "milliseconds"],
        microsecond: ["microsecond", "microseconds"],
      },
      short: {
        day: "d",
        hour: "h",
        minute: "m",
        second: "s",
        millisecond: "ms",
        microsecond: "μs",
      },
      lessThan: {
        day: "less than a day",
        hour: "less than an hour",
        minute: "less than a minute",
        second: "less than a second",
        millisecond: "less than a millisecond",
        microsecond: "less than a microsecond",
      },
    },
  };

  // Setting default options
  options = { style: "mixed", locale: "en-US", ...options };

  /**
   * An inner function to recursively format the duration in the largest unit possible.
   */
  const inner = (
    microseconds: number,
    options: FormatDurationOptions
  ): { text: string[]; precision: FormatDurationPrecision } => {
    // If the style is "mixed", the style is determined by the duration.
    // Setting style to undefined will allow later to pick the correct style depending on the duration. In the "mixed"
    // mode, the first part of the duration will be displayed in long format and the remaining parts in short format
    // (ex: 2 days 5h 3m)
    const style = options.style === "mixed" ? undefined : options.style;

    // Convert the precision to microseconds
    const precisionInMicroseconds: number = options.precision
      ? {
          day: MICROSECONDS_IN_A_DAY,
          hour: MICROSECONDS_IN_A_HOUR,
          minute: MICROSECONDS_IN_A_MINUTE,
          second: MICROSECONDS_IN_A_SECOND,
          millisecond: MICROSECONDS_IN_A_MILLISECOND,
          microsecond: 1,
        }[options.precision]
      : 1;

    const milliseconds = Math.floor(microseconds / 1000);
    const seconds = Math.floor(microseconds / 1000000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      // display 2 days 6h 5m
      const suffixes = locales[options.locale][style || "long"].day;
      const next = inner(microseconds % (days * MICROSECONDS_IN_A_DAY), {
        style: options.style === "mixed" ? "short" : options.style,
        precision: options.precision || "minute",
        locale: options.locale,
      });
      return {
        text: [`${days}${Array.isArray(suffixes) ? " " + suffixes[days > 1 ? 1 : 0] : suffixes}`, ...next.text],
        precision: next.precision || "day",
      };
    } else if (hours > 0 && precisionInMicroseconds < MICROSECONDS_IN_A_DAY) {
      // display 2 hours 5m
      const suffixes = locales[options.locale][style || "long"].hour;
      const next = inner(microseconds % (hours * MICROSECONDS_IN_A_HOUR), {
        style: options.style === "mixed" ? "short" : options.style,
        precision: options.precision || "minute",
        locale: options.locale,
      });
      return {
        text: [`${hours}${Array.isArray(suffixes) ? " " + suffixes[hours > 1 ? 1 : 0] : suffixes}`, ...next.text],
        precision: next.precision || "hour",
      };
    } else if (minutes > 0 && precisionInMicroseconds < MICROSECONDS_IN_A_HOUR) {
      const suffixes = locales[options.locale][style || "long"].minute;
      const next = inner(microseconds % (minutes * MICROSECONDS_IN_A_MINUTE), {
        style: options.style === "mixed" ? "short" : options.style,
        precision: options.precision || "second",
        locale: options.locale,
      });
      return {
        text: [`${minutes}${Array.isArray(suffixes) ? " " + suffixes[minutes > 1 ? 1 : 0] : suffixes}`, ...next.text],
        precision: next.precision || "minute",
      };
    } else if (seconds > 0 && precisionInMicroseconds < MICROSECONDS_IN_A_MINUTE) {
      const suffixes = locales[options.locale][style || "long"].second;
      const next = inner(microseconds % (seconds * MICROSECONDS_IN_A_SECOND), {
        style: options.style === "mixed" ? "short" : options.style,
        precision: options.precision || "second",
        locale: options.locale,
      });
      return {
        text: [`${seconds}${Array.isArray(suffixes) ? " " + suffixes[seconds > 1 ? 1 : 0] : suffixes}`, ...next.text],
        precision: next.precision || "second",
      };
    } else if (milliseconds > 0 && precisionInMicroseconds < MICROSECONDS_IN_A_SECOND) {
      const suffixes = locales[options.locale][style || "long"].millisecond;
      const next = inner(microseconds % (milliseconds * MICROSECONDS_IN_A_MILLISECOND), {
        style: options.style === "mixed" ? "short" : options.style,
        precision: options.precision || "millisecond",
        locale: options.locale,
      });
      return {
        text: [
          `${milliseconds}${Array.isArray(suffixes) ? " " + suffixes[milliseconds > 1 ? 1 : 0] : suffixes}`,
          ...next.text,
        ],
        precision: next.precision || "millisecond",
      };
    } else if (microseconds && precisionInMicroseconds < MICROSECONDS_IN_A_MILLISECOND) {
      const suffixes = locales[options.locale][style || "long"].microsecond;
      return {
        text: [`${microseconds}${Array.isArray(suffixes) ? " " + suffixes[microseconds > 1 ? 1 : 0] : suffixes}`],
        precision: "microsecond",
      };
    } else {
      return {
        text: [],
        precision: undefined,
      };
    }
  };

  const result = inner(microseconds, options);
  if (result.text.length === 0) {
    return [locales[options.locale].lessThan[options.precision], result.precision];
  } else {
    return [result.text.join(" "), result.precision];
  }
}

/**
 * The precision of the date returned by {@link formatRelativeDate}.
 */
export type FormatRelativeDatePrecision = Exclude<TimeUnit, "year" | "month" | "millisecond" | "microsecond">;

/**
 * Options for {@link formatRelativeDate}.
 *
 * - `locale`: The locale to use for formatting the date.
 * - `currentDate`: The current date to use as a reference for the relative date.
 */
export type FormatRelativeDateOptions = {
  locale?: Locale;
  currentDate?: Date;
};

/**
 * Format a date to a human-readable relative time.
 *
 * This function formats a date to a relative time such as 'yesterday', '1 hour ago', or an actual date if the date is
 * to far in the past or future.
 *
 * @param date The date to format.
 * @param options Options to customize the output. The default options are `{ locale: "en-US", currentDate: new Date() }`.
 * @returns The formatted relative date and the precision of the date returned.
 *
 * @example
 * ```typescript
 * const date = new Date("2022-06-21 12:00:00"); // Tue Jun 21 2022 12:00:00
 * const options: FormatRelativeDateOptions = { locale: "en-US", currentDate: new Date("2022-06-21 13:00:00") };
 * const [text, precision] = formatRelativeDate(date, options);
 * // text = "1 hour ago"
 * // precision = "hour"
 * ```
 */
export function formatRelativeDate(
  date: Date,
  options?: FormatRelativeDateOptions
): [string, FormatRelativeDatePrecision] {
  options = {
    locale: "en-US",
    currentDate: new Date(),
    ...options,
  };
  const diff = options.currentDate.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (Math.abs(years) > 0 || (days > 2 && options.currentDate.getFullYear() !== date.getFullYear())) {
    // If the date is more than a year away or not in the same calendar year and more than 2 days away we want to
    // display the full date, show as 'January 1, 2022'
    return [
      new Intl.DateTimeFormat(options.locale, { year: "numeric", month: "long", day: "numeric" }).format(date),
      "day",
    ];
  } else if (Math.abs(months) > 0) {
    // Same year but more than a month away, show as 'January 1'
    return [new Intl.DateTimeFormat(options.locale, { month: "long", day: "numeric" }).format(date), "day"];
  } else if (Math.abs(days) > 2) {
    // Less than a month away but more than 2 days away, show as 'Monday, January 1'
    return [
      new Intl.DateTimeFormat(options.locale, { weekday: "long", month: "long", day: "numeric" }).format(date),
      "day",
    ];
  } else if (options.currentDate.getDay() !== date.getDay()) {
    // Less than 2 days away but not the same day, show as 'yesterday' or 'tomorrow'
    return [
      new Intl.RelativeTimeFormat(options.locale, {
        numeric: "auto",
      }).format(-days, "day"),
      "day",
    ];
  } else if (Math.abs(hours) > 0) {
    // Today but more than an hour away, show as '6 hours ago'
    return [
      new Intl.RelativeTimeFormat(options.locale, {
        numeric: "auto",
      }).format(-hours, "hour"),
      "hour",
    ];
  } else if (Math.abs(minutes) > 0) {
    // Today but more than a minute away, show as '6 minutes ago'
    return [
      new Intl.RelativeTimeFormat(options.locale, {
        numeric: "auto",
      }).format(-minutes, "minute"),
      "minute",
    ];
  } else {
    // Today but more than a second away, show as '1 second ago'
    return [
      new Intl.RelativeTimeFormat(options.locale, {
        numeric: "auto",
      }).format(-seconds, "second"),
      "second",
    ];
  }
}
