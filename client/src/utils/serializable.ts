import "reflect-metadata";

import { ObjectFactory, ObjectFactoryConstructor, ObjectFactoryFunction } from "@/utils/types";
import {
  deserializeArray,
  deserializeBoolean,
  deserializeDate,
  deserializeFloat,
  deserializeInteger,
  deserializeObject,
  deserializeRecord,
  deserializeString,
  DeserializeStringFormatOption,
  safeDeserialization,
  SerializationError,
} from "@/utils/serializers";
import { raise } from "@/utils/telemetry";

const METADATA_SERIALIZER = Symbol("serializer");
const METADATA_DESERIALIZER = Symbol("deserializer");
const METADATA_DEPENDENCIES = Symbol("dependencies");
const METADATA_REQUIRED = Symbol("required");

function isClassInstance(obj: object): boolean {
  return obj.constructor !== Object;
}

/**
 * Function used as an object property deserializer.
 *
 * Those functions are always called with `this` being the object initialized by the deserialization.
 * When declaring your custom deserializer using the `deserializer option`, you can specify the type of `this`  as the
 * first parameter of the function:
 *
 * @example
 * ```ts
 * function customDeserializer(this: MyObject, value: unknown, key?: string): any {}
 * ```
 *
 * @see {@link SerializableCommonOptions}, option `deserializer`.
 * @see {@link https://www.typescriptlang.org/docs/handbook/2/functions.html#declaring-this-in-a-function}
 */
type Deserializer = (value: unknown, key: string | number) => [string | number, unknown];

/**
 * A function used to serialize a value.
 *
 * @param value - The value to serialize.
 * @param key - The property name if the value is a property of an object or the index in the array if the
 *              value is in an array.
 */
type Serializer = (value: unknown, key: string | number) => [string | number, unknown];

export function deserialize<T extends object>(value: unknown, factory: ObjectFactory<T>, name?: string): T {
  if (value === null || value === undefined) {
    return value as T;
  } else if (Array.isArray(value)) {
    return deserializeArray(value, (item) => {
      return deserialize(item, factory);
    }) as object as T;
  } else {
    const target = callFactory<T>(factory);
    deserializeObject(
      value,
      ([key, value]: [string, unknown]) => {
        // This function is called for each property of the object being deserialized.
        const deserializer: Deserializer | undefined = Reflect.getMetadata(METADATA_DESERIALIZER, target, key);
        if (deserializer) {
          const [dkey, dvalue] = deserializer.call(target, value, key);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return ((target as any)[dkey] = dvalue);
        }
        return null;
      },
      {
        thisArg: target,
        name: name,
        required: Reflect.getMetadata(METADATA_REQUIRED, target),
        dependencies: Reflect.getMetadata(METADATA_DEPENDENCIES, target),
      },
    );
    return target;
  }
}

/**
 * Serialize an object or an array that use the @serialization decoration.
 *
 * This function is used to serialize a class instance or an array of class instances that use the @serialization
 * decoration.
 *
 * If the target is an array of plain object or a plain object, the function will act as a pass-through and just return
 * the target.
 *
 * @param target The target object or array to serialize.
 * @param key The property key if this object is a nested property.
 * @returns The object or array serialized according to the @serialization decorations.
 */
export function serialize<T extends object>(target: T | T[], key?: string | number): object {
  try {
    if (Array.isArray(target)) {
      return target.map((item, index) => {
        if (isClassInstance(item)) return safeDeserialization(serialize, index, item as T);
        else return item;
      });
    } else if (isClassInstance(target)) {
      let serializedTarget = {};
      Object.entries(target)
        .filter(([, value]) => value != undefined && value != null)
        .forEach(([key, value]) => {
          const serializer: Serializer | undefined = Reflect.getMetadata(METADATA_SERIALIZER, target, key);
          if (serializer) {
            const [skey, svalue] = safeDeserialization(serializer, key, value);
            serializedTarget = { ...serializedTarget, [skey as string]: svalue };
          }
        });
      return serializedTarget;
    } else {
      // for plain objects we are acting as a pass-through
      return target;
    }
  } catch (e) {
    throw SerializationError.make(e).addContext(key);
  }
}

function callFactory<T extends object>(factory: ObjectFactory<T>, ...args: unknown[]): T {
  if (factory.prototype === undefined) {
    return (factory as ObjectFactoryFunction<T>)(...args);
  } else {
    const _constructor = factory as ObjectFactoryConstructor<T>;
    return new _constructor();
  }
}

/**
 * Decorators
 */

type SerializableType =
  | "string"
  | "boolean"
  | "integer"
  | "float"
  | "datetime"
  | "object"
  | "identifier"
  | "array"
  | "any"
  | "record";

/**
 * Options used by the @serializable decoration.
 *
 * @property name - The name of the property in the serialized object. If not specified, the name of the property.
 * @property required - If true, the property is required in the serialized object.
 * @property snakeCase - Convert the property name and value to/from snake case. If "property", only the property name
 *                       is converted, if "value", only the value is converted, if "all", both are converted.
 * @property dependencies - The list of properties that must be defined in the object to serialize/deserialize this property.
 * @property deserializer - A custom deserializer function.
 * @property serializer - A custom serializer function.
 * @property skip - Skip the serialization or deserialization of the property. If both are skipped, the property is not
 *                  serialized nor deserialized but can be used as a dependency.
 */
type SerializableCommonOptions = {
  name?: string;
  required?: boolean;
  snakeCase?: "property" | "value" | "all";
  dependencies?: string[] | string;
  deserializer?: Deserializer;
  serializer?: Serializer;
  skip?: "serialize" | "deserialize" | "both";
};

type SerializableStringOptions = {
  format?: DeserializeStringFormatOption;
  trim?: boolean;
};

type SerializableNumberOptions = {
  min?: number;
  max?: number;
};

type SerializableObjectOptions<T extends object> = {
  factory?: ObjectFactory<T>;
};

type SerializableArrayOptions<T extends object> = {
  items?: {
    type: SerializableType;
    options?: SerializableOptions<T>;
  };
};

type SerializableOptions<T extends object> = SerializableCommonOptions &
  SerializableStringOptions &
  SerializableNumberOptions &
  SerializableObjectOptions<T> &
  SerializableArrayOptions<T>;

// Generate a function that transforms a property name to a serialized property name.
//
// This function is used to apply the `snakeCase` and `name` options of the @serializable decoration.
// For example, if the `snakeCase` option is set to "property" or "all", the function will convert the property name
// to snake case (e.g. "myProperty" => "my_property").
//
// This method uses the `snakeCase` and `name` options.
function getSerializerKeyFunction(options?: SerializableCommonOptions): (key: string | number) => string {
  if (options?.snakeCase === "property" || options?.snakeCase === "all") {
    options?.name && raise("The 'name' option is not compatible with the 'snakeCase' option.");
    return (key: string | number): string => {
      return (key as string).replace(/([A-Z])/g, "_$1").toLowerCase();
    };
  } else if (options?.name) {
    return () => options.name;
  } else {
    return (key: string | number): string => {
      return key as string;
    };
  }
}

function makeSerializer<T extends object>(type: SerializableType, options?: SerializableOptions<T>): Serializer {
  const fnTransformKey = getSerializerKeyFunction(options);
  switch (type) {
    case "object": {
      return (value: unknown, key: string | number) => {
        return [fnTransformKey(key), serialize(value as object, key)];
      };
    }
    case "array": {
      const items = options?.items;
      /* c8 ignore start */
      if (!items) {
        raise(`The 'items' option is required for the decoration @serialize("array")`);
      }
      /* c8 ignore end */
      const itemSerializer = makeSerializer(items.type, items.options);
      return (value: unknown, key: string | number) => {
        const propertyKey = options?.name ?? key;
        return [
          propertyKey,
          (value as Array<unknown>).map((value, index) => {
            try {
              const [, sval] = itemSerializer(value, index);
              return sval;
            } catch (e) {
              SerializationError.make(e).addContext(index);
            }
          }),
        ];
      };
    }
    case "datetime": {
      return (value: unknown, key: string | number) => {
        if (value instanceof Date) {
          return [fnTransformKey(key), value.toISOString()];
        }
      };
    }
    case null: {
      return (_: unknown, key: string | number) => {
        return [fnTransformKey(key), null];
      };
    }
    default: {
      // TODO: Add the support of SnakeCase on the value.
      return (value: unknown, key: string | number) => {
        return [fnTransformKey(key), value];
      };
    }
  }
}

function safeKey(key: string | number): string | undefined {
  return typeof key === "string" ? key : undefined;
}

// Generate a function that transforms a serialized property name to an object property name.
//
// This function is used to apply the `snakeCase` and `name` options of the @serializable decoration.
// For example, if the `snakeCase` option is set to "property" or "all", the function will convert the serialized
// property name (expected to be snake_case) to camelCase (e.g. "my_property" => "myProperty").
//
// This method uses the `snakeCase` and `name` options.
function getDeserializerKeyFunction(options?: SerializableCommonOptions): (key: string | number) => string {
  if (options?.snakeCase === "property" || options?.snakeCase === "all") {
    options?.name && raise("The 'name' option is not compatible with the 'snakeCase' option.");
    return (key: string | number): string => {
      return (key as string).replace(/_(\w)/g, (_match, letter) => {
        return letter.toUpperCase();
      });
    };
  } else if (options?.name) {
    return () => options.name;
  } else {
    return (key: string | number): string => {
      return key as string;
    };
  }
}

function makeDeserializer<T extends object>(type: SerializableType, options?: SerializableOptions<T>): Deserializer {
  const fnTransformKey = getDeserializerKeyFunction(options);
  switch (type) {
    case "string": {
      // TODO: Add the support of SnakeCase on the value.
      return (value: unknown, key: string | number) => {
        return [fnTransformKey(key), deserializeString(value, { ...options, name: safeKey(key) })];
      };
    }
    case "integer": {
      return (value: unknown, key: string | number) => {
        return [fnTransformKey(key), deserializeInteger(value, { ...options, name: safeKey(key) })];
      };
    }
    case "float": {
      return (value: unknown, key: string | number) => {
        return [fnTransformKey(key), deserializeFloat(value, { ...options, name: safeKey(key) })];
      };
    }
    case "boolean": {
      return (value: unknown, key: string | number) => {
        return [fnTransformKey(key), deserializeBoolean(value, { ...options, name: safeKey(key) })];
      };
    }
    case "datetime": {
      return (value: unknown, key: string | number) => {
        return [fnTransformKey(key), deserializeDate(value, { ...options, name: safeKey(key) })];
      };
    }
    case "object": {
      return (value: unknown, key: string | number) => {
        const objectFactory: ObjectFactory<T> | undefined = options?.factory;
        /* c8 ignore start */
        if (!objectFactory) {
          raise(`The 'factory' option is required for the decoration @serialize("object")`);
        }
        /* c8 ignore end */
        return [fnTransformKey(key), deserialize<T>(value, objectFactory, safeKey(key))];
      };
    }
    case "record": {
      const items = options?.items;
      /* c8 ignore start */
      if (!items) {
        raise(`The 'items' option is required for the decoration @serialize("record")`);
      }
      /* c8 ignore end */
      return (value: unknown, key: string | number) => {
        const itemDeserializer = makeDeserializer(items.type, items.options);
        return [
          fnTransformKey(key),
          deserializeRecord(value, (item, index) => [item[0], itemDeserializer(item[1], index)[1]]),
        ];
      };
    }
    case "array": {
      const items = options?.items;
      /* c8 ignore start */
      if (!items) {
        raise(`The 'items' option is required for the decoration @serialize("array")`);
      }
      /* c8 ignore end */
      return (value: unknown, key: string | number) => {
        const itemDeserializer = makeDeserializer(items.type, items.options);
        return [
          key,
          deserializeArray(
            value,
            (item: unknown, index) => {
              const [, itemValue] = itemDeserializer(item, index);
              return itemValue;
            },
            { ...options, name: safeKey(key) },
          ),
        ];
      };
    }
    case "any": {
      return (value: unknown, key: string | number) => {
        return [fnTransformKey(key), value];
      };
    }
    default: {
      // TODO:
      return (value: unknown, key: string | number) => {
        raise("Not implemented yet");
        return [fnTransformKey(key), value];
      };
    }
  }
}

export function serializable<T extends object>(type: SerializableType, options?: SerializableOptions<T>) {
  return function (target: object, key: string) {
    // TODO: Check if we could use reflect-metadata:
    // - to get the type of a property.
    // => https://www.typescriptlang.org/docs/handbook/decorators.html#metadata
    // const __type = Reflect.getMetadata("design:type", target, key);
    const propertyKey = getSerializerKeyFunction(options)(key);
    if (options?.required) {
      const required = [...(Reflect.getMetadata(METADATA_REQUIRED, target) ?? []), propertyKey];
      Reflect.defineMetadata(METADATA_REQUIRED, required, target);
    }
    if (options?.dependencies) {
      const dependencies = Reflect.getMetadata(METADATA_DEPENDENCIES, target) || {};
      dependencies[propertyKey] = Array.isArray(options.dependencies) ? options.dependencies : [options.dependencies];
      Reflect.defineMetadata(METADATA_DEPENDENCIES, dependencies, target);
    }

    // Deserializer
    // FIXME: fix the options as object
    const deserializer = options?.deserializer ?? makeDeserializer(type, options);
    Reflect.defineMetadata(METADATA_DESERIALIZER, deserializer, target, propertyKey);

    // Serializer
    const serializer = options?.serializer ?? makeSerializer(type, options);
    Reflect.defineMetadata(METADATA_SERIALIZER, serializer, target, key);
  };
}

/**
 * An utility function to create a regular expression that matches any of the values.
 *
 * @param values - An array of string values.
 * @returns A regular expression that matches any of the values.
 */
export function formatRegExp(values: readonly string[]): RegExp {
  return new RegExp(`^${values.join("|")}$`);
}
