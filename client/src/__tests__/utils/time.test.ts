import { test, expect } from "vitest";
import {
  FormatRelativeDateOptions,
  MICROSECONDS_IN_A_DAY,
  MICROSECONDS_IN_A_HOUR,
  MICROSECONDS_IN_A_MILLISECOND,
  MICROSECONDS_IN_A_MINUTE,
  MICROSECONDS_IN_A_SECOND,
  addTime,
  formatDuration,
  formatRelativeDate,
  truncDate,
} from "@/utils/time";

test("formatRelativeDate", () => {
  const date = new Date("2022-06-21 12:00:00"); /* Tue Jun 21 2022 12:00:00 */
  const options: FormatRelativeDateOptions = { locale: "en-US", currentDate: date };

  expect(formatRelativeDate(truncDate(date, "year"), options)[0]).toBe("January 1");
  expect(formatRelativeDate(addTime(date, -1, "year"), options)[0]).toBe("June 21, 2021");
  expect(formatRelativeDate(addTime(date, -1, "month"), options)[0]).toBe("May 21");
  expect(formatRelativeDate(addTime(date, -3, "day"), options)[0]).toBe("Saturday, June 18");
  expect(formatRelativeDate(addTime(date, -1, "day"), options)[0]).toBe("yesterday");
  expect(formatRelativeDate(addTime(date, -6, "hour"), options)[0]).toBe("6 hours ago");
  expect(formatRelativeDate(addTime(date, -6, "minute"), options)[0]).toBe("6 minutes ago");
  expect(formatRelativeDate(addTime(date, -1, "second"), options)[0]).toBe("1 second ago");
  expect(formatRelativeDate(addTime(date, -1, "millisecond"), options)[0]).toBe("now");
});

test("formatDuration", () => {
  const duration_singulars =
    MICROSECONDS_IN_A_DAY +
    MICROSECONDS_IN_A_HOUR +
    MICROSECONDS_IN_A_MINUTE +
    MICROSECONDS_IN_A_SECOND +
    MICROSECONDS_IN_A_MILLISECOND +
    1;
  expect(formatDuration(duration_singulars)).toStrictEqual(["1 day 1h 1m", "minute"]);
  expect(formatDuration(duration_singulars, { precision: "microsecond" })).toStrictEqual([
    "1 day 1h 1m 1s 1ms 1μs",
    "microsecond",
  ]);
  expect(formatDuration(duration_singulars, { precision: "microsecond", style: "short" })[0]).toBe(
    "1d 1h 1m 1s 1ms 1μs"
  );
  expect(formatDuration(duration_singulars, { precision: "microsecond", style: "long" })[0]).toBe(
    "1 day 1 hour 1 minute 1 second 1 millisecond 1 microsecond"
  );

  const duration_plurals =
    2 * MICROSECONDS_IN_A_DAY +
    2 * MICROSECONDS_IN_A_HOUR +
    2 * MICROSECONDS_IN_A_MINUTE +
    2 * MICROSECONDS_IN_A_SECOND +
    2 * MICROSECONDS_IN_A_MILLISECOND +
    2;
  expect(formatDuration(duration_plurals)[0]).toBe("2 days 2h 2m");
  expect(formatDuration(duration_plurals, { precision: "microsecond" })[0]).toBe("2 days 2h 2m 2s 2ms 2μs");
  expect(formatDuration(duration_plurals, { precision: "microsecond", style: "short" })[0]).toBe("2d 2h 2m 2s 2ms 2μs");
  expect(formatDuration(duration_plurals, { precision: "microsecond", style: "long" })[0]).toBe(
    "2 days 2 hours 2 minutes 2 seconds 2 milliseconds 2 microseconds"
  );

  // precision
  expect(formatDuration(duration_singulars, { precision: "day", style: "short" })[0]).toBe("1d");
  expect(formatDuration(duration_singulars, { precision: "hour", style: "short" })[0]).toBe("1d 1h");
  expect(formatDuration(duration_singulars, { precision: "minute", style: "short" })[0]).toBe("1d 1h 1m");
  expect(formatDuration(duration_singulars, { precision: "second", style: "short" })[0]).toBe("1d 1h 1m 1s");
  expect(formatDuration(duration_singulars, { precision: "millisecond", style: "short" })[0]).toBe("1d 1h 1m 1s 1ms");

  // zeros
  expect(
    formatDuration(3 * MICROSECONDS_IN_A_HOUR + 12 * MICROSECONDS_IN_A_MINUTE, {
      precision: "minute",
      style: "short",
    })[0]
  ).toBe("3h 12m");
  expect(
    formatDuration(3 * MICROSECONDS_IN_A_HOUR + 32 * MICROSECONDS_IN_A_SECOND, {
      precision: "minute",
      style: "short",
    })[0]
  ).toBe("3h");
  expect(
    formatDuration(3 * MICROSECONDS_IN_A_HOUR + 32 * MICROSECONDS_IN_A_SECOND, {
      precision: "millisecond",
      style: "short",
    })[0]
  ).toBe("3h 32s");

  // less than the precision
  expect(formatDuration(1, { precision: "day", style: "short" })[0]).toBe("less than a day");
  expect(formatDuration(1, { precision: "hour", style: "short" })[0]).toBe("less than an hour");
  expect(formatDuration(1, { precision: "minute", style: "short" })[0]).toBe("less than a minute");
  expect(formatDuration(1, { precision: "second", style: "short" })[0]).toBe("less than a second");
  expect(formatDuration(1, { precision: "millisecond", style: "short" })[0]).toBe("less than a millisecond");
  expect(formatDuration(0, { precision: "microsecond", style: "short" })[0]).toBe("less than a microsecond");
});

test("addTime", () => {
  const date = new Date("2022-02-01 12:00:00");
  const offset = (seconds: number) => new Date(date.getTime() + seconds * 1000);

  expect(addTime(date, 1, "day")).toStrictEqual(offset(86400));
  expect(addTime(date, 1, "hour")).toStrictEqual(offset(3600));
  expect(addTime(date, 1, "minute")).toStrictEqual(offset(60));
  expect(addTime(date, 1, "second")).toStrictEqual(offset(1));
  expect(addTime(date, 1, "millisecond")).toStrictEqual(offset(0.001));
  expect(addTime(date, 1, "microsecond")).toStrictEqual(offset(0.000001));
});

test("truncDate", () => {
  const date = new Date("2022-02-03 12:34:56.789");
  expect(truncDate(date, "year")).toStrictEqual(new Date("2022-01-01 00:00:00"));
  expect(truncDate(date, "month")).toStrictEqual(new Date("2022-02-01 00:00:00"));
  expect(truncDate(date, "day")).toStrictEqual(new Date("2022-02-03 00:00:00"));
  expect(truncDate(date, "hour")).toStrictEqual(new Date("2022-02-03 12:00:00"));
  expect(truncDate(date, "minute")).toStrictEqual(new Date("2022-02-03 12:34:00"));
  expect(truncDate(date, "second")).toStrictEqual(new Date("2022-02-03 12:34:56"));
  expect(truncDate(date, "millisecond")).toStrictEqual(new Date("2022-02-03 12:34:56.789"));
  expect(truncDate(date, "microsecond")).toStrictEqual(new Date("2022-02-03 12:34:56.789"));
});
