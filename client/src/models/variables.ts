import { serializable } from "@/utils/serializable";
import { raise } from "@/utils/telemetry";
import { immerable } from "immer";

export const VARIABLE_TYPES = ["text", "boolean", "date", "timestamp", "float", "integer", "secret"] as const;
export type VariableType = (typeof VARIABLE_TYPES)[number];

export class VariableValue {
  @serializable("string")
  text?: string;

  @serializable("boolean")
  boolean?: boolean;

  @serializable("string")
  date?: string;

  @serializable("string")
  timestamp?: string;

  /// TODO: Add support for float
  // @serializable("float")
  // float?: number;

  @serializable("integer")
  integer?: number;

  @serializable("string")
  secret?: string;

  constructor(object?: Partial<VariableValue>) {
    Object.assign(this, object);
  }
}

export class Variable {
  [immerable] = true;

  @serializable("string", { format: "identifier", required: true })
  readonly name!: string;

  @serializable("object", { name: "value", factory: VariableValue })
  _value?: VariableValue;

  @serializable("string")
  readonly description: string;

  constructor(object?: Partial<Variable>) {
    Object.assign(this, object);
  }

  getType(): VariableType {
    for (const key in this._value) {
      if (key as keyof VariableType) {
        return key as VariableType;
      }
    }
  }

  set value(value: Partial<VariableValue>) {
    if (value === undefined) {
      raise("Variable value cannot be undefined");
    } else {
      this._value = new VariableValue(value);
    }
  }

  get value(): VariableValue {
    return this._value;
  }
}
