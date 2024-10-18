import { ObjectFactory } from "@/utils/types";
import { deserialize } from "@/utils/serializable";
import { Table, tableFromIPC } from "apache-arrow";
import { MEDIA_TYPE_APPLICATION_JSON, MEDIA_TYPE_APPLICATION_VND_APACHE_ARROW_STREAM } from "@/utils/constants";

/**
 * A serialized resource.
 */
export class SerializedResource<T extends object> {
  private readonly contentType: string;
  private readonly value?: T | string | ArrayBuffer;

  constructor(contentType: string, value?: T | string | ArrayBuffer) {
    this.contentType = contentType;
    this.value = value;
  }

  as(factory: ObjectFactory<T>): T {
    if (typeof this.value !== "string" || !this.value) {
      throw new Error("No data available.");
    } else if (this.contentType !== MEDIA_TYPE_APPLICATION_JSON) {
      throw new Error(
        `Expecting 'content-type: ${MEDIA_TYPE_APPLICATION_JSON}', found 'content-type: ${this.contentType}'`,
      );
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

  asTable(): Table {
    if (!(this.value instanceof ArrayBuffer) || !this.value) {
      throw new Error("No data available.");
    } else if (this.contentType !== MEDIA_TYPE_APPLICATION_VND_APACHE_ARROW_STREAM) {
      throw new Error(
        `Expecting 'content-type: ${MEDIA_TYPE_APPLICATION_VND_APACHE_ARROW_STREAM}', found 'content-type: ${this.contentType}'`,
      );
    }
    const table = tableFromIPC(new Uint8Array(this.value));
    return table;
  }
}
