import { ObjectFactory } from "@/utils/types";
import { deserialize } from "@/utils/serializable";

export class SerializedResource<T extends object> {
  private readonly contentType: string;
  private readonly value?: T | string;

  constructor(contentType: string, value?: T | string) {
    this.contentType = contentType;
    this.value = value;
  }

  as(factory: ObjectFactory<T>): T {
    if (typeof this.value !== "string" || !this.value) {
      throw new Error("No data available.");
    } else if (this.contentType !== "application/json") {
      throw new Error(`Expecting 'content-type: application/json', found 'content-type: ${this.contentType}'`);
    }

    const data = JSON.parse(this.value);
    return deserialize(data, factory);
  }

  asArray(factory: ObjectFactory<T>): T[] {
    return this.as(factory) as T[];
  }

  asText(): string {
    if (typeof this.value !== "string" || !this.value) {
      throw new Error("No data available.");
    } else if (!this.contentType.startsWith("text/")) {
      throw new Error(`Expecting 'content-type: text/...', found 'content-type: ${this.contentType}'`);
    }

    return this.value;
  }
}
