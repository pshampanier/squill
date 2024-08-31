import { formatRegExp, serializable } from "@/utils/serializable";

const CONTENT_TYPE = ["connections", "environments", "favorites"] as const;
export type ContentType = (typeof CONTENT_TYPE)[number];

export class Folder {
  @serializable("string", { format: "uuid", snakeCase: "property", required: true })
  folderId!: string;

  @serializable("string", { format: "uuid", snakeCase: "property" })
  parentId?: string;

  @serializable("string", { format: "uuid", snakeCase: "property", required: true })
  ownerUserId!: string;

  @serializable("string", { format: formatRegExp(CONTENT_TYPE), required: true })
  contentType!: ContentType;

  @serializable("string", { required: true })
  name!: string;

  constructor(object: Partial<Folder>) {
    Object.assign(this, object);
  }
}
