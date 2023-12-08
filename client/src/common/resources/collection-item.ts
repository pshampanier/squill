import { serializable } from "@/utils/serializable";

type CollectionItemProps<T> = {
  id?: string;
  type: "folder" | Exclude<T, "folder">;
  children?: CollectionItem<T>[];
};

export class CollectionItem<T> {
  @serializable("string", { format: "uuid" })
  readonly id: string = crypto.randomUUID();

  @serializable("string", { required: true, trim: true })
  name!: string;

  @serializable("string", { required: true })
  readonly type!: "folder" | Exclude<T, "folder">;

  @serializable("array", {
    items: {
      type: "object",
      options: {
        factory: () => {
          // We need to use a factory function here instead of the constructor, because the CollectionItem
          // class is not yet fully defined at this point and the constructor is not yet available.
          return new CollectionItem<T>();
        },
      },
    },
  })
  children?: CollectionItem<T>[];

  constructor();
  constructor(name: string, props: CollectionItemProps<T>);
  constructor(...args: unknown[]) {
    if (args.length == 2) {
      const [name, props] = args as [string, CollectionItemProps<T>];
      this.type = props.type;
      this.children = this.type === "folder" ? props.children ?? new Array<CollectionItem<T>>() : undefined;
      this.name = name;
      this.id = props.id ? props.id : this.id;
    }
  }

  clone(): Readonly<CollectionItem<T>> {
    return Object.freeze(new CollectionItem<T>(this.name, { type: this.type, id: this.id, children: this.children }));
  }

  static find<T>(items: CollectionItem<T>[], id: string): { path: string[]; item: CollectionItem<T> } | null {
    for (const value of items) {
      if (value.id === id) {
        return { path: [], item: value };
      } else if (value.children) {
        const found = CollectionItem.find<T>(value.children, id);
        if (found) {
          return { ...found, path: [value.name, ...found.path] };
        }
      }
    }
    return null;
  }
}

// TODO: This class should be replaced by ResourceRef.
export class CollectionItemLink<T> extends CollectionItem<T> {
  readonly path: string[];

  constructor(path: string[], name: string, props: CollectionItemProps<T>) {
    super(name, props);
    this.path = path;
  }
}
