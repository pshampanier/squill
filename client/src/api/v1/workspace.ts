import { agent } from "@/resources/agent";
import { Workspace } from "@/resources/workspace/workspace";
import { Resource } from "@/resources/resource";
import { ResourceRef } from "@/resources/resource-ref";
import { User } from "@/resources/user/user";

export async function loadCollectionItem<T extends object>(
  workspace: Workspace,
  resourceRef: ResourceRef
): Promise<Resource<T>> {
  return await agent().get<T>(
    `/users/${User.current.username}/collections/${workspace.name}/${resourceRef.getURIEncodedFullPath()}`
  );
}
