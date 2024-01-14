export class ResourceRef {
  private readonly _id?: string;
  private readonly _name?: string;
  private readonly _path?: string[];

  constructor(id: string);
  constructor(path: string[], name: string);
  constructor(...args: unknown[]) {
    if (args.length === 1 && typeof args[0] === "string") {
      this._id = args[0] as string;
    } else if (args.length === 2 && Array.isArray(args[0]) && typeof args[1] === "string") {
      this._path = args[0] as string[];
      this._name = args[1] as string;
    }
  }

  get id(): string {
    if (!this._id) {
      throw new Error("DEBUG: ResourceRef is not an ID reference");
    }
    return this._id;
  }

  get path(): string[] {
    if (!this._path) {
      throw new Error("DEBUG: ResourceRef is not a path/name reference");
    }
    return this._path;
  }

  get name(): string {
    if (!this._name) {
      throw new Error("DEBUG: ResourceRef is not a path/name reference");
    }
    return this._name;
  }

  getURIEncodedFullPath(): string {
    return [...this.path, this.name].map(encodeURIComponent).join("/");
  }
}
