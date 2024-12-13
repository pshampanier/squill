/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 ********************************************************************/
import { formatRegExp, serializable } from "@/utils/serializable";
import * as resources from "@/models/resources";
import { RESOURCE_TYPE_VALUES } from "@/models/resources";

/**
 * A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 
 * 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
 */
type ResourceType = resources.ResourceType;


/**
 * A special collection in the catalog.
 */
export const SPECIAL_COLLECTION_VALUES = ["favorites", "trash"] as const;
export type SpecialCollection = (typeof SPECIAL_COLLECTION_VALUES)[number];

/**
 * A collection resources stored in the catalog.
 **/
export class Collection {
  
  /**
   * The unique identifier of the collection.
   **/
  @serializable("string", { format: "uuid", required: true, snakeCase: "property" })
  collectionId!: string;
  
  /**
   * The name of the collection.
   **/
  @serializable("string", { required: true })
  name!: string;
  
  /**
   * The unique identifier of the user that owns the collection.
   **/
  @serializable("string", { format: "uuid", required: true, snakeCase: "property" })
  ownerUserId!: string;
  
  /**
   * The unique identifier of the parent resource in the catalog.
   **/
  @serializable("string", { format: "uuid", snakeCase: "property" })
  parentId?: string;
  
  /**
   * The type of resources in the collection.
   * If empty the collection can contain any type of resources.
   * 
   **/
  @serializable("string", { format: formatRegExp(RESOURCE_TYPE_VALUES), snakeCase: "property" })
  resourcesType?: ResourceType;
  
  /**
   * The special collection type.
   **/
  @serializable("string", { format: formatRegExp(SPECIAL_COLLECTION_VALUES) })
  special?: SpecialCollection;
  
  constructor(object?: Partial<Collection>) {
    Object.assign(this, object);
  }
}