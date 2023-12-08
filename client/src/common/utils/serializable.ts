import "reflect-metadata";

import { ObjectFactory, ObjectFactoryConstructor, ObjectFactoryFunction } from "./types";
import {
  deserializeArray,
  deserializeBoolean,
  deserializeInteger,
  deserializeObject,
  deserializeString,
  DeserializeStringFormatOption,
  safeDeserialization,
  SerialisationError,
} from "./serializers";
import { raise } from "./telemetry";

const METADATA_SERIALISER = Symbol("serializer");
const METADATA_DESERIALIZER = Symbol("deserializer");
const METADATA_DEPENDENCIES = Symbol("dependencies");
const METADATA_REQUIRED = Symbol("required");

/**
 * Function used as an object property deserializer.
 *
 * Those functions are always called with `this` being the object initialized by the deserialization.
 * When declaring your custom deserializer uing the `deserializer option`, you can specify the type of `this`  as the
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
  if (Array.isArray(value)) {
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
      }
    );
    return target;
  }
}

/**
 * Serialize an object or an array that use the @serialization decoration.
 *
 * @param target The target object or array to serialize.
 * @param key The property key if this object is a nested property.
 * @returns The object or array serialized according to the @serialization decorations.
 */
export function serialize<T extends object>(target: T | T[], key?: string | number): object {
  try {
    if (Array.isArray(target)) {
      return target.map((item, index) => {
        return safeDeserialization(serialize, index, item as T);
      });
    } else {
      let serializedTarget = {};
      Object.entries(target)
        .filter(([, value]) => value != undefined && value != null)
        .forEach(([key, value]) => {
          const serializer: Serializer | undefined = Reflect.getMetadata(METADATA_SERIALISER, target, key);
          if (serializer) {
            const [skey, svalue] = safeDeserialization(serializer, key, value);
            serializedTarget = { ...serializedTarget, [skey as string]: svalue };
          }
        });
      return serializedTarget;
    }
  } catch (e) {
    throw SerialisationError.make(e).addContext(key);
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

type SerializableType = "string" | "boolean" | "integer" | "object" | "identifier" | "array" | "any";

/**
 * Options used by the @serializable decoration.
 *
 * @property name - The name of the property in the serialized object. If not specified, the name of the property.
 * @property required - If true, the property is required in the serialized object.
 * @property dependencies - The list of properties that must be defined in the object to serialize/deserialize this property.
 * @property deserializer - A custom deserializer function.
 * @property serializer - A custom serializer function.
 * @property skip - Skip the serialization or deserialization of the property. If both are skipped, the property is not
 *                  serialized nor deserialized but can be used as a dependency.
 */
type SerializableCommonOptions = {
  name?: string;
  required?: boolean;
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

function makeSerializer<T extends object>(type: SerializableType, options?: SerializableOptions<T>): Serializer {
  switch (type) {
    case "object": {
      return (value: unknown, key: string | number) => {
        const propertyKey = options?.name ?? key;
        return [propertyKey, serialize(value as object, key)];
      };
    }
    case "array": {
      const items = options?.items;
      /* c8 ignore start */
      if (!items) {
        raise(`The 'items' option is required for the decoration @serialise("array")`);
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
              SerialisationError.make(e).addContext(index);
            }
          }),
        ];
      };
    }
    case null: {
      return (_: unknown, key: string | number) => {
        const propertyKey = options?.name ?? key;
        return [propertyKey, null];
      };
    }
    default: {
      return (value: unknown, key: string | number) => {
        const propertyKey = options?.name ?? key;
        return [propertyKey, value];
      };
    }
  }
}

function safeKey(key: string | number): string | undefined {
  return typeof key === "string" ? key : undefined;
}

function makeDeserializer<T extends object>(type: SerializableType, options?: SerializableOptions<T>): Deserializer {
  switch (type) {
    case "string": {
      return (value: unknown, key: string | number) => {
        return [key, deserializeString(value, { ...options, name: safeKey(key) })];
      };
    }
    case "integer": {
      return (value: unknown, key: string | number) => {
        return [key, deserializeInteger(value, { ...options, name: safeKey(key) })];
      };
    }
    case "boolean": {
      return (value: unknown, key: string | number) => {
        return [key, deserializeBoolean(value, { ...options, name: safeKey(key) })];
      };
    }
    case "object": {
      return (value: unknown, key: string | number) => {
        const objectFactory: ObjectFactory<T> | undefined = options?.factory;
        /* c8 ignore start */
        if (!objectFactory) {
          raise(`The 'factory' option is required for the decoration @serialise("object")`);
        }
        /* c8 ignore end */
        return [key, deserialize<T>(value, objectFactory, safeKey(key))];
      };
    }
    case "array": {
      const items = options?.items;
      /* c8 ignore start */
      if (!items) {
        raise(`The 'items' option is required for the decoration @serialise("array")`);
        throw new SyntaxError(`The 'items' option is required for the decoration @serialise("array")`);
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
            { ...options, name: safeKey(key) }
          ),
        ];
      };
    }
    case "any": {
      return (value: unknown, key: string | number) => {
        return [key, value];
      };
    }
    default: {
      // TODO:
      return (value: unknown, key: string | number) => {
        raise("Not implemented yet");
        return [key, value];
      };
    }
  }
}

export function serializable<T extends object>(type: SerializableType, options?: SerializableOptions<T>) {
  return function (target: object, key: string) {
    // TODO: Check if we could use reflec-metadata:
    // - to get the type of a property.
    // => https://www.typescriptlang.org/docs/handbook/decorators.html#metadata
    // const __type = Reflect.getMetadata("design:type", target, key);
    const propertyKey = options?.name ?? key;
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
    Reflect.defineMetadata(METADATA_SERIALISER, serializer, target, key);
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
