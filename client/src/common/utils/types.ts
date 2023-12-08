export type ObjectFactoryFunction<T extends object> = (...args: unknown[]) => T;
export type ObjectFactoryConstructor<T extends object> = new (...args: unknown[]) => T;
export type ObjectFactory<T extends object> = ObjectFactoryConstructor<T> | ObjectFactoryFunction<T>;
