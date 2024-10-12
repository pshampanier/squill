import { SVGIcon } from "@/utils/types";

export const NO_ICON = null as unknown as SVGIcon;
export const NO_TEXT = null as unknown as string;

// List of http headers
export const HTTP_HEADER_CONTENT_TYPE = "Content-Type";
export const HTTP_HEADER_AUTHORIZATION = "Authorization";
export const HTTP_HEADER_X_API_KEY = "X-Api-Key";
export const HTTP_HEADER_X_REQUEST_ID = "X-Request-ID";
export const HTTP_HEADER_X_RESOURCE_TYPE = "X-Resource-Type";
export const HTTP_HEADER_X_ORIGIN = "X-Origin";

// List of media type
export const MEDIA_TYPE_APPLICATION_JSON = "application/json";
export const MEDIA_TYPE_PLAIN_TEXT = "plain/text";

// List of editor names
export const EDITOR_CONNECTION = "Connection";
export const EDITOR_USER_BLANK = "UserBlank";

// List of metadata keys used by ResourceRef
export const METADATA_RESOURCES_TYPE = "resources_type";
export const METADATA_SPECIAL = "special";

// UI constants & defaults
export const MIN_PRIMARY_SIDEBAR_WIDTH = 250;
export const MAX_PRIMARY_SIDEBAR_WIDTH = 500;
export const DEFAULT_PRIMARY_SIDEBAR_WIDTH = 256;

/**
 * A catalog id associated to the root catalog.
 */
export const ROOT_CATALOG_ID = "root-catalog-id";

/**
 * A catalog id associated to a blank page.
 */
export const BLANK_PAGE_ITEM_ID = "blank";

/**
 * A catalog id associated to an item not found.
 */
export const NOT_FOUND_ITEM_ID = "not-found";
