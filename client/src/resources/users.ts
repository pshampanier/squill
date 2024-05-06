import { AuthRequest } from "@/models/auth";
import { User, UserSettings } from "@/models/users";
import { agent } from "@/resources/agent";
import { CollectionItem } from "@/resources/collection-item";

export type CatalogEntryType = "folder" | "workspace" | "environment" | "connection" | "unknown";
export type CatalogEntry = CollectionItem<CatalogEntryType>;

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

  async readCatalog(path: string): Promise<CatalogEntry[]> {
    const encodedPath = encodeURIComponent(path);
    const encodedUsername = encodeURIComponent(this.current.username);
    return (await agent().get<CatalogEntry>(`/users/${encodedUsername}/catalog?path=${encodedPath}`)).asArray(
      CollectionItem<CatalogEntryType>
    );
  },

  async renameCatalogEntry(path: string, newName: string): Promise<void> {
    const encodedPath = encodeURIComponent(path);
    const encodedUsername = encodeURIComponent(this.current.username);
    await agent().post(`/users/${encodedUsername}/catalog/rename?path=${encodedPath}`, { new_name: newName });
  },

  /**
   * Add an entry to the user's catalog.
   */
  async createCatalogEntry<T extends object>(path: string, item: T): Promise<CatalogEntry> {
    const encodedPath = encodeURIComponent(path);
    const encodedUsername = encodeURIComponent(this.current.username);
    return (await agent().post<T, CatalogEntry>(`/users/${encodedUsername}/catalog?path=${encodedPath}`, item)).as(
      CollectionItem<CatalogEntryType>
    );
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
