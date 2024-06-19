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
  generateDateClassifier,
  ALL_DATE_CLASSIFICATIONS,
  formatDateClassification,
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
    8 * MICROSECONDS_IN_A_DAY +
    MICROSECONDS_IN_A_HOUR +
    MICROSECONDS_IN_A_MINUTE +
    MICROSECONDS_IN_A_SECOND +
    MICROSECONDS_IN_A_MILLISECOND +
    1;
  expect(formatDuration(duration_singulars)).toStrictEqual(["1 week 1d 1h 1m", "minute"]);
  expect(formatDuration(duration_singulars, { precision: "microsecond" })).toStrictEqual([
    "1 week 1d 1h 1m 1s 1ms 1μs",
    "microsecond",
  ]);
  expect(formatDuration(duration_singulars, { precision: "microsecond", style: "short" })[0]).toBe(
    "1w 1d 1h 1m 1s 1ms 1μs",
  );
  expect(formatDuration(duration_singulars, { precision: "microsecond", style: "long" })[0]).toBe(
    "1 week 1 day 1 hour 1 minute 1 second 1 millisecond 1 microsecond",
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
    "2 days 2 hours 2 minutes 2 seconds 2 milliseconds 2 microseconds",
  );

  // precision
  expect(formatDuration(duration_singulars, { precision: "week", style: "short" })[0]).toBe("1w");
  expect(formatDuration(duration_singulars, { precision: "day", style: "short" })[0]).toBe("1w 1d");
  expect(formatDuration(duration_singulars, { precision: "hour", style: "short" })[0]).toBe("1w 1d 1h");
  expect(formatDuration(duration_singulars, { precision: "minute", style: "short" })[0]).toBe("1w 1d 1h 1m");
  expect(formatDuration(duration_singulars, { precision: "second", style: "short" })[0]).toBe("1w 1d 1h 1m 1s");
  expect(formatDuration(duration_singulars, { precision: "millisecond", style: "short" })[0]).toBe(
    "1w 1d 1h 1m 1s 1ms",
  );

  // zeros
  expect(
    formatDuration(3 * MICROSECONDS_IN_A_HOUR + 12 * MICROSECONDS_IN_A_MINUTE, {
      precision: "minute",
      style: "short",
    })[0],
  ).toBe("3h 12m");
  expect(
    formatDuration(3 * MICROSECONDS_IN_A_HOUR + 32 * MICROSECONDS_IN_A_SECOND, {
      precision: "minute",
      style: "short",
    })[0],
  ).toBe("3h");
  expect(
    formatDuration(3 * MICROSECONDS_IN_A_HOUR + 32 * MICROSECONDS_IN_A_SECOND, {
      precision: "millisecond",
      style: "short",
    })[0],
  ).toBe("3h 32s");

  // less than the precision
  expect(formatDuration(1, { precision: "week", style: "short" })[0]).toBe("less than a week");
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

  expect(addTime(date, 1, "week")).toStrictEqual(offset(86400 * 7));
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
  expect(truncDate(date, "week")).toStrictEqual(new Date("2022-01-30 00:00:00"));
  expect(truncDate(date, "day")).toStrictEqual(new Date("2022-02-03 00:00:00"));
  expect(truncDate(date, "hour")).toStrictEqual(new Date("2022-02-03 12:00:00"));
  expect(truncDate(date, "minute")).toStrictEqual(new Date("2022-02-03 12:34:00"));
  expect(truncDate(date, "second")).toStrictEqual(new Date("2022-02-03 12:34:56"));
  expect(truncDate(date, "millisecond")).toStrictEqual(new Date("2022-02-03 12:34:56.789"));
  expect(truncDate(date, "microsecond")).toStrictEqual(new Date("2022-02-03 12:34:56.789"));
});

test("generateDateClassifier", () => {
  const classifier = generateDateClassifier(ALL_DATE_CLASSIFICATIONS, {
    currentDate: new Date("2024-12-31 12:00:00") /* Tue Dec 31 2024 */,
  });

  expect(classifier(new Date("2024-12-31 09:00:00"))).toBe("today");
  expect(classifier(new Date("2024-12-31 22:00:00"))).toBe("today");
  expect(classifier(new Date("2024-12-30 21:00:00"))).toBe("yesterday");
  expect(classifier(new Date("2024-12-29 21:00:00"))).toBe("this_week");
  expect(classifier(new Date("2024-12-28 21:00:00"))).toBe("last_week");
  expect(classifier(new Date("2024-12-22 21:00:00"))).toBe("last_week");
  expect(classifier(new Date("2024-12-21 21:00:00"))).toBe("this_month");
  expect(classifier(new Date("2024-12-01 21:00:00"))).toBe("this_month");
  expect(classifier(new Date("2024-11-01 21:00:00"))).toBe("last_month");
  expect(classifier(new Date("2024-10-01 21:00:00"))).toBe("last_october");
  expect(classifier(new Date("2024-09-01 21:00:00"))).toBe("last_september");
  expect(classifier(new Date("2024-08-01 21:00:00"))).toBe("last_august");
  expect(classifier(new Date("2024-07-01 21:00:00"))).toBe("last_july");
  expect(classifier(new Date("2024-06-01 21:00:00"))).toBe("last_june");
  expect(classifier(new Date("2024-05-01 21:00:00"))).toBe("last_may");
  expect(classifier(new Date("2024-04-01 21:00:00"))).toBe("last_april");
  expect(classifier(new Date("2024-03-01 21:00:00"))).toBe("last_march");
  expect(classifier(new Date("2024-02-01 21:00:00"))).toBe("last_february");
  expect(classifier(new Date("2024-01-01 21:00:00"))).toBe("last_january");
  expect(classifier(new Date("2023-12-31 21:00:00"))).toBe("last_year");
  expect(classifier(new Date("2023-01-01 21:00:00"))).toBe("last_year");
  expect(classifier(new Date("2022-12-31 21:00:00"))).toBe("before_last_year");
});

test("formatDateClassification", () => {
  expect(formatDateClassification("today")).toBe("today");
  expect(formatDateClassification("yesterday")).toBe("yesterday");
  expect(formatDateClassification("this_week")).toBe("this week");
  expect(formatDateClassification("last_week")).toBe("last week");
  expect(formatDateClassification("this_month")).toBe("this month");
  expect(formatDateClassification("last_month")).toBe("last month");
  expect(formatDateClassification("last_december")).toBe("december");
  expect(formatDateClassification("last_november")).toBe("november");
  expect(formatDateClassification("last_october")).toBe("october");
  expect(formatDateClassification("last_september")).toBe("september");
  expect(formatDateClassification("last_august")).toBe("august");
  expect(formatDateClassification("last_july")).toBe("july");
  expect(formatDateClassification("last_june")).toBe("june");
  expect(formatDateClassification("last_may")).toBe("may");
  expect(formatDateClassification("last_april")).toBe("april");
  expect(formatDateClassification("last_march")).toBe("march");
  expect(formatDateClassification("last_february")).toBe("february");
  expect(formatDateClassification("last_january")).toBe("january");
  expect(formatDateClassification("last_year")).toBe("last year");
  expect(formatDateClassification("before_last_year")).toBe("before last year");
});
