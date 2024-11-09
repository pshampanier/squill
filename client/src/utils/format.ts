/**
 * An interface for formatting values.
 */
export interface Format {
  /**
   * Format the value.
   */
  format(value: unknown): string;
}

/**
 * A format that displays the value as a number.
 */
export class NumberFormat implements Format {
  private numberFormat!: Intl.NumberFormat;

  constructor(locale: string, options: Intl.NumberFormatOptions) {
    this.numberFormat = new Intl.NumberFormat(locale, options);
  }

  format(value: unknown): string {
    if (value === null || value === undefined) {
      return null;
    } else if (value instanceof Number || typeof value === "number" || typeof value === "bigint") {
      return this.numberFormat.format(value as number);
    } else if (typeof value === "string") {
      const parsedValue = parseFloat(value);
      if (!isNaN(parsedValue)) {
        return this.numberFormat.format(parsedValue);
      }
    }
    return value.toString();
  }
}

export class BooleanFormat implements Format {
  format(value: unknown): string {
    if (value === null || value === undefined) {
      return null;
    } else {
      return value ? "✔" : "✘";
    }
  }
}

export class DateFormat implements Format {
  private dateFormat!: Intl.DateTimeFormat;

  constructor(locale: string, options: Intl.DateTimeFormatOptions) {
    this.dateFormat = new Intl.DateTimeFormat(locale, options);
  }

  format(value: unknown): string {
    if (value === null || value === undefined) {
      return null;
    } else if (value instanceof Date) {
      return this.dateFormat.format(value);
    } else if (typeof value === "number") {
      // this is expected to be the number of milliseconds since the epoch
      return this.dateFormat.format(new Date(value));
    }
    return value.toString();
  }
}

/**
 * A format that displays the value as a string.
 */
export class DefaultFormat implements Format {
  format(value: unknown): string {
    if (value === null || value === undefined) {
      return null;
    } else {
      return value.toString();
    }
  }
}
