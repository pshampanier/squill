import { agent } from "@/resources/agent";
import { CollectionItem } from "@/resources/collection-item";
import { ResourceRef } from "@/resources/resource-ref";
import { User, UserCollectionItem, UserCollectionItemType } from "@/resources/user/user";
import { UserSettings } from "@/resources/user/user-settings";
import { Workspace } from "@/resources/workspace/workspace";

export async function listCollectionFolder(user: User, ref: ResourceRef): Promise<UserCollectionItem[]> {
  return (
    await agent().get<UserCollectionItem>(`/users/${user.username}/collections/${ref.getURIEncodedFullPath()}`)
  ).asArray(CollectionItem<UserCollectionItemType>);
}

export async function getWorkspace(user: User, ref: ResourceRef): Promise<Workspace> {
  return (
    await agent().get<Workspace>(`/users/${user.username}/collections/${ref.getURIEncodedFullPath()}/workspace`)
  ).as(Workspace);
}

export async function saveSettings(user: User, settings: UserSettings): Promise<UserSettings> {
  return (await agent().put(`/users/${user.username}/settings`, settings)).as(UserSettings);
}
