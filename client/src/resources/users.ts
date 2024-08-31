import { AuthRequest } from "@/models/auth";
import { ResourceType, ResourceRef } from "@/models/resources";
import { User, UserSettings } from "@/models/users";
import { agent } from "@/resources/agent";
import { HTTP_HEADER_X_RESOURCE_TYPE } from "@/utils/constants";

/**
 * User resources
 *
 * This resource is used to interact with the users of the application.
 * Once the logon method is called, the current user is stored in the Users object and can be accessed using the
 * `current` property.
 */
const Users = {
  _current: User,

  /**
   * The current user logged in.
   *
   * This method will throw an error if no user is logged in.
   */
  get current(): User {
    if (!this._current) {
      throw new Error("No user logged in");
    }
    return this._current;
  },

  async logon(auth: AuthRequest): Promise<User> {
    await agent().logon(auth);
    const encodedUsername = encodeURIComponent(auth.credentials.username);
    this._current = (await agent().get<User>(`/users/${encodedUsername}/user`)).as(User);
    return this._current;
  },

  async readCatalog(parentId?: string): Promise<ResourceRef[]> {
    const encodedUsername = encodeURIComponent(this.current.username);
    const catalogPath = parentId ? `catalog/${encodeURIComponent(parentId)}/list` : `catalog/list`;
    return (await agent().get<ResourceRef>(`/users/${encodedUsername}/${catalogPath}`)).asArray(ResourceRef);
  },

  async renameCatalogEntry(resourceId: string, newName: string): Promise<void> {
    const encodedUsername = encodeURIComponent(this.current.username);
    const encodedResourceId = encodeURIComponent(resourceId);
    await agent().post(`/users/${encodedUsername}/catalog/${encodedResourceId}/rename?path=`, { new_name: newName });
  },

  async createCatalogResource<T extends object>(type: ResourceType, item: T): Promise<ResourceRef> {
    const encodedUsername = encodeURIComponent(this.current.username);
    return (
      await agent().post<T, ResourceRef>(`/users/${encodedUsername}/catalog`, item, {
        headers: { [HTTP_HEADER_X_RESOURCE_TYPE]: type },
      })
    ).as(ResourceRef);
  },

  // Save the settings for the current user.
  //
  // If the settings are successfully saved, the new settings are applied to the current user and then returned.
  // This method will throw an error if no user is logged in.
  async saveSettings(settings: UserSettings): Promise<UserSettings> {
    this.current.settings = (
      await agent().put<UserSettings, UserSettings>(`/users/${this.current.username}/settings`, settings)
    ).as(UserSettings);
    return this.current.settings;
  },
};

export default Users;
