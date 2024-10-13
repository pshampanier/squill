import { ResourceRef } from "@/models/resources";
import { SVGIcon } from "@/utils/types";
import { Users } from "@/resources/users";
import Connections from "@/resources/connections";
import ConnectionEditor from "@/components/editors/ConnectionEditor";
import BlankPageIcon from "@/icons/app-logo.svg?react";
import NotFoundIcon from "@/icons/crashed.svg?react";
import PlugIcon from "@/icons/plug.svg?react";
import { ApplicationSpace } from "@/utils/types";
import UserBlankEditor from "@/components/editors/UserBlankEditor";
import { BLANK_PAGE_ITEM_ID, NOT_FOUND_ITEM_ID } from "@/utils/constants";
import { Connection } from "@/models/connections";
import { Environment } from "@/models/environments";

export const BLANK_PAGE_TITLE = "Untitled";
export const NOT_FOUND_PAGE_TITLE = "Not Found";

export type AnyResource = Connection | Environment;

export interface ResourceHandler {
  /**
   * Get the resource identified by the given reference.
   */
  get(ref: ResourceRef): Promise<AnyResource>;

  /**
   * List the content of the resource identified by the given reference.
   */
  list(ref: ResourceRef): Promise<ResourceRef[]>;

  /**
   * Get the icon of the resource identified by the given reference.
   */
  icon(ref: ResourceRef): SVGIcon;

  /**
   * Get the title of the resource identified by the given reference.
   * This is used in the UI to display the name of the resource, it may be different from the name of the resource.
   */
  title(ref: ResourceRef): string;

  /**
   * Get the editor for the resource identified by the given reference.
   */
  editor(ref: ResourceRef, space: ApplicationSpace): React.FunctionComponent<{ pageId: string }>;
}

/**
 * A resource handler for pseudo resources that are not backed by a real resource (e.g. blank page, not found page).
 */
const NonResource: ResourceHandler = {
  /**
   * Get the resource identified by the given reference.
   */
  async get<T extends object>(_ref: ResourceRef): Promise<T> {
    return Promise.resolve({} as T);
  },

  /**
   * List the content of the resource identified by the given reference.
   */
  async list(_ref: ResourceRef): Promise<ResourceRef[]> {
    return Promise.resolve([]);
  },

  /**
   * Get the icon of the resource identified by the given reference.
   */
  icon(ref: ResourceRef): SVGIcon {
    switch (ref.id) {
      case BLANK_PAGE_ITEM_ID: {
        return BlankPageIcon;
      }
      case NOT_FOUND_ITEM_ID: {
        return NotFoundIcon;
      }
    }
  },

  /**
   * Get the title of the resource identified by the given reference.
   * This is used in the UI to display the name of the resource, it may be different from the name of the resource.
   */
  title(ref: ResourceRef): string {
    switch (ref.id) {
      case BLANK_PAGE_ITEM_ID: {
        return BLANK_PAGE_TITLE;
      }
      case NOT_FOUND_ITEM_ID: {
        return NOT_FOUND_PAGE_TITLE;
      }
    }
  },

  /**
   * Get the editor for the resource identified by the given reference.
   */
  editor(_ref: ResourceRef, space: ApplicationSpace): React.FunctionComponent<{ pageId: string }> {
    switch (space) {
      case "user": {
        return UserBlankEditor;
      }
      default: {
        throw new Error("Not implemented");
      }
    }
  },
};

const Catalog: ResourceHandler = {
  async get<T extends object>(ref: ResourceRef): Promise<T> {
    switch (ref.type) {
      case "connection": {
        return Connections.get(ref.id) as unknown as T;
      }
      default: {
        throw new Error("Not implemented");
      }
    }
  },

  async list(ref: ResourceRef): Promise<ResourceRef[]> {
    switch (ref.type) {
      case "collection": {
        return Users.listCatalog(ref.id);
      }
      case "connection": {
        // TODO: describe the contents of the connection.
        throw new Error("Not implemented");
      }
      default: {
        throw new Error("Not implemented");
      }
    }
  },

  icon(ref: ResourceRef): SVGIcon {
    switch (ref.type) {
      case "connection": {
        return PlugIcon;
      }
      default: {
        throw new Error("ResourceHandler.icon: Not implemented for type " + ref.type);
      }
    }
  },

  title(ref: ResourceRef): string {
    return ref.name;
  },

  /**
   * Get the editor for the resource identified by the given reference.
   */
  editor(ref: ResourceRef): React.FunctionComponent<{ pageId: string }> {
    switch (ref.type) {
      case "connection": {
        return ConnectionEditor;
      }
      default: {
        throw new Error("Not implemented");
      }
    }
  },
};

/**
 * Get the resource handler for the given resource type.
 */
export const getResourceHandler = function (ref: ResourceRef): ResourceHandler {
  if (ref.id === BLANK_PAGE_ITEM_ID || ref.id === NOT_FOUND_ITEM_ID) {
    return NonResource;
  } else {
    switch (ref.type) {
      case "connection":
      case "environment":
      case "collection": {
        return Catalog;
      }
      default: {
        throw new Error("Not implemented: getResourceHandler for type " + ref.type);
      }
    }
  }
};
