import { formatRegExp, serializable } from "@/utils/serializable";

const RESOURCE_TYPE = ["connection", "environment", "folder", "user"] as const;
export type ResourceType = (typeof RESOURCE_TYPE)[number];

export class ResourceRef {
  @serializable("string", { format: "uuid" })
  id: string;

  @serializable("string", { format: "uuid", snakeCase: "property" })
  parentId?: string;

  @serializable("string", { format: "uuid", snakeCase: "property" })
  ownerUserId?: string;

  @serializable("string", { format: formatRegExp(RESOURCE_TYPE) })
  type: ResourceType;

  @serializable("string")
  name: string;

  @serializable("record", { items: { type: "string" } })
  metadata: Record<string, string>;

  constructor(object: Partial<ResourceRef>) {
    Object.assign(this, object);
  }
}
