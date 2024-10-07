/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 ********************************************************************/
import { formatRegExp, serializable } from "@/utils/serializable";

export const RESOURCE_TYPE_VALUES = ["connection", "environment", "collection", "user"] as const;
export type ResourceType = (typeof RESOURCE_TYPE_VALUES)[number];


/**
 * A reference to a resource.
   * 
   * A resource reference is a lightweight object that contains the unique identifier of the resource, and some
   * additional properties of the resource that are useful to use the resource without having to load it.
   * 
 **/
export class ResourceRef {
  
  /**
   * Unique identifier of the resource.
   **/
  @serializable("string", { format: "uuid", required: true })
  id!: string;
  
  /**
   * Additional metadata of the resource.
   * 
   * Metadata are key-value pairs that provide additional information without having to load the resource itself.
   * For example, the content type of a `collection`, or the driver of a `connection`.
   * 
   **/
  @serializable("record", { items: { type: "string" } })
  metadata?: Record<string, string>;
  
  /**
   * Name of the resource.
   **/
  @serializable("string", { required: true })
  name!: string;
  
  /**
   * Unique identifier of the user who own the resource.
   **/
  @serializable("string", { format: "uuid", snakeCase: "property" })
  ownerUserId?: string;
  
  /**
   * Unique identifier of the parent resource.
   **/
  @serializable("string", { format: "uuid", snakeCase: "property" })
  parentId?: string;
  
  @serializable("string", { format: formatRegExp(RESOURCE_TYPE_VALUES), required: true })
  type!: ResourceType;
  
  constructor(object?: Partial<ResourceRef>) {
    Object.assign(this, object);
  }
}