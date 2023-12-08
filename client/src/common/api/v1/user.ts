import { agent } from "@/resources/agent";
import { CollectionItem } from "@/resources/collection-item";
import { ResourceRef } from "@/resources/resource-ref";
import { User, UserCollectionItem, UserCollectionItemType } from "@/resources/user/user";
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
