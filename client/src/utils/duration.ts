import { TimeUnit } from "@/utils/time";

/**
 * A duration of time.
 *
 * Same as `TimeUnit` but without `year` and `month` because their duration is not fixed.
 */
export type DurationUnit = Exclude<TimeUnit, "year" | "month">;

export class Duration {
  private _value: number;
  private _unit: DurationUnit;

  constructor(value: number, unit: DurationUnit) {
    this._value = value;
    this._unit = unit;
  }

  get value(): number {
    return this._value;
  }

  get unit(): DurationUnit {
    return this._unit;
  }

  toMilliseconds(): number {
    switch (this._unit) {
      case "microsecond":
        return this._value / 1000;
      case "millisecond":
        return this._value;
      case "second":
        return this._value * 1000;
      case "minute":
        return this._value * 60 * 1000;
      case "hour":
        return this._value * 60 * 60 * 1000;
      case "day":
        return this._value * 24 * 60 * 60 * 1000;
    }
  }

  toString(): string {
    return `${this._value} ${this._unit}`;
  }
}
