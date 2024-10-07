use std::collections::HashMap;

use crate::models::{resources::ResourceRef, ResourceType};
use crate::resources::Resource;
use crate::utils::validators::CatalogName;
use crate::{err_conflict, err_not_found, Result};
use anyhow::Context;
use futures::StreamExt;
use serde_json::Value;
use squill_drivers::futures::{Connection, RowStream};
use squill_drivers::{execute, params};
use uuid::Uuid;

/// The catalog is a collection of resources that can be stored in the agent database and organized in a tree-like
/// structure.
///
/// The catalog is used to store resources such as connections, environments, and collections. Each resource is
/// identified by a unique identifier and can have a parent resource. The catalog is owned by a user and can only be
/// accessed by the owner.
///
/// The catalog is stored in the `catalog` table in the agent database. The table has the following structure:
///
/// ```text
/// catalog_id ...  type        parent_catalog_id  owner_user_id ...  name          data ...  metadata            ...
/// --------------  ----------  -----------------  -----------------  ------------  --------  -----------------------
/// 6d7d727b-c5...  collection                     dd81802d-a9e2-...  Connections   {"col...  {"resources_type":"c...
/// 61f2e45e-b6...  collection                     dd81802d-a9e2-...  Environments  {"col...  {"resources_type":"e...
/// 2fa7e1bd-b4...  collection                     dd81802d-a9e2-...  Favorites     {"col...  {"special":"favorite...
/// ```

/// Create a new catalog item for a user resource.
pub async fn add<T: Resource>(conn: &Connection, resource: &T) -> Result<ResourceRef> {
    conn.execute(
        r#"INSERT INTO catalog (
        catalog_id,
        type,
        parent_catalog_id,
        owner_user_id,
        name,
        data,
        metadata
    ) VALUES(?, ?, ?, ?, ?, ?, ?)"#,
        params!(
            resource.id(),
            resource.resource_type().as_str(),
            resource.parent_id(),
            resource.owner_user_id(),
            resource.name(),
            serde_json::to_string(&resource)?,
            match resource.metadata().is_empty() {
                false => Some(serde_json::to_string(&resource.metadata())?),
                true => None::<String>,
            }
        ),
    )
    .await?;
    Ok(resource.into())
}

pub async fn get<T: Resource>(conn: &Connection, catalog_id: Uuid) -> Result<T> {
    match conn
        .query_row(
            r#"SELECT name, parent_catalog_id, data
                   FROM catalog
                  WHERE catalog_id = ?"#,
            params!(catalog_id),
        )
        .await
    {
        Ok(Some(row)) => {
            let name: String = row.try_get("name")?;
            let parent_catalog_id: Option<Uuid> = row.try_get_nullable("parent_catalog_id")?;
            let data: Value = serde_json::from_str(&row.try_get::<_, String>("data")?)?;
            T::from_storage(parent_catalog_id.unwrap_or(Uuid::nil()), name, data)
        }
        Ok(None) => Err(err_not_found!("The element no longer exists.")),
        Err(err) => Err(err.into()),
    }
    // err.with_context(|| format!("Failed to get the catalog element (catalog_id: {}).", catalog_id))
}

pub async fn rename(conn: &Connection, user_id: Uuid, catalog_id: Uuid, new_name: &CatalogName) -> Result<()> {
    match execute!(
        conn,
        "UPDATE catalog SET name=? WHERE catalog_id=? AND owner_user_id=?",
        new_name.as_str(),
        catalog_id,
        user_id
    )
    .await
    {
        Ok(1) => Ok(()),
        Ok(_) => Err(err_not_found!("The element to be renamed does not exist.")),
        Err(err) => {
            match err {
                // This is a custom error that we defined in the `error` module.
                // It is used to return a 404 status code when the element to be renamed does not exist.
                squill_drivers::Error::ConstraintViolation { error: _ } => {
                    Err(err_conflict!("'{}' already exists.", new_name.as_str()))
                }
                _ => Err(err.into()),
            }
        }
    }
}

pub async fn list(conn: &Connection, user_id: Uuid, parent_catalog_id: Uuid) -> Result<Vec<ResourceRef>> {
    let mut statement = match parent_catalog_id.is_nil() {
        false => {
            let mut statement = conn
                .prepare(
                    r#"SELECT catalog_id, type, name, metadata
                                   FROM catalog
                                  WHERE owner_user_id = ? 
                                    AND parent_catalog_id = ?
                                  ORDER BY name"#,
                )
                .await?;
            statement.bind(params!(user_id, parent_catalog_id)).await?;
            statement
        }
        true => {
            let mut statement = conn
                .prepare(
                    r#"SELECT catalog_id, type, name, metadata
                                   FROM catalog
                                  WHERE owner_user_id = ? 
                                    AND parent_catalog_id IS NULL
                                  ORDER BY name"#,
                )
                .await?;
            statement.bind(params!(user_id.to_string())).await?;
            statement
        }
    };

    let mut resources: Vec<ResourceRef> = Vec::new();
    let mut rows: RowStream = statement.query().await?.into();
    while let Some(row) = rows.next().await {
        let row = row?;
        let catalog_id: Uuid = row.try_get("catalog_id")?;
        let catalog_resource = ResourceRef {
            id: catalog_id,
            parent_id: parent_catalog_id,
            owner_user_id: user_id,
            resource_type: ResourceType::try_from(row.try_get::<_, String>("type")?.as_str())?,
            name: row.try_get("name")?,
            metadata: row
                .try_get_nullable::<_, String>("metadata")?
                .map(|metadata| match serde_json::from_str::<HashMap<String, String>>(&metadata) {
                    Ok(metadata) => Ok(metadata),
                    Err(e) => Err(e).with_context(|| {
                        format!("Invalid metadata: (catalog_id: '{}', metadata: '{}').", catalog_id, metadata)
                    }),
                })
                .transpose()?
                .unwrap_or_default(),
        };
        resources.push(catalog_resource);
    }
    Ok(resources)
}

#[cfg(test)]
mod tests {
    use crate::models::{Collection, ResourceType};
    use crate::resources::catalog;
    use crate::resources::catalog::Resource;
    use crate::resources::users::{self, local_username};
    use crate::utils::tests;
    use tokio_test::{assert_err, assert_ok};
    use uuid::Uuid;

    #[tokio::test]
    async fn test_catalog_add() {
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let conn = conn_pool.get().await.unwrap();
        let local_user = users::get_by_username(&conn, local_username()).await.unwrap();
        // create a root catalog entries
        let root_collection = Collection {
            name: "New Collection".to_string(),
            owner_user_id: local_user.user_id,
            resources_type: Some(ResourceType::Connection),
            ..Default::default()
        };
        let collection_dup_id = Collection { name: "another_name".to_string(), ..root_collection.clone() };
        assert_ok!(catalog::add(&conn, &root_collection).await);
        assert_err!(catalog::add(&conn, &collection_dup_id).await);

        let sub_collection = Collection {
            name: "Sub Collection".to_string(),
            parent_id: root_collection.id(),
            owner_user_id: local_user.user_id,
            ..Default::default()
        };
        let sub_collection_dup_name = Collection { collection_id: Uuid::new_v4(), ..sub_collection.clone() };

        assert_ok!(catalog::add(&conn, &sub_collection).await);
        assert_err!(catalog::add(&conn, &sub_collection_dup_name).await);
    }

    #[tokio::test]
    async fn test_catalog_list() {
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let conn = conn_pool.get().await.unwrap();
        let local_user = users::get_by_username(&conn, local_username()).await.unwrap();

        // We are listing the root catalog entries for the user, which should only contain the default collections.
        // Then we are adding a new collection at the root level and listing the root catalog entries again.
        let default_catalog = assert_ok!(catalog::list(&conn, local_user.user_id, Uuid::nil()).await);
        let new_collection = assert_ok!(
            catalog::add(
                &conn,
                &Collection {
                    name: "Another collection".to_string(),
                    owner_user_id: local_user.user_id,
                    resources_type: Some(ResourceType::Connection),
                    ..Default::default()
                }
            )
            .await
        );
        assert_eq!(
            assert_ok!(catalog::list(&conn, local_user.user_id, Uuid::nil()).await).len(),
            default_catalog.len() + 1
        );

        // Now adding a sub-collection to the newly created collection.
        let sub_collection = assert_ok!(
            catalog::add(
                &conn,
                &Collection {
                    name: "Sub-collection".to_string(),
                    parent_id: new_collection.id,
                    owner_user_id: local_user.user_id,
                    resources_type: Some(ResourceType::Connection),
                    ..Default::default()
                }
            )
            .await
        );
        let new_collection_catalog = assert_ok!(catalog::list(&conn, local_user.user_id, new_collection.id).await);
        assert_eq!(new_collection_catalog.len(), 1);
        assert_eq!(new_collection_catalog[0].name, sub_collection.name);
        assert_eq!(new_collection_catalog[0].parent_id, new_collection.id);
        assert_eq!(new_collection_catalog[0].owner_user_id, local_user.user_id);
        assert_eq!(new_collection_catalog[0].resource_type, sub_collection.resource_type);
    }
}
