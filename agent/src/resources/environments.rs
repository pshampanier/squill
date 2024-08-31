use crate::models::Environment;
use crate::models::ResourceType;
use crate::resources::Resource;
use std::collections::HashMap;
use uuid::Uuid;

impl Resource for Environment {
    fn id(&self) -> &Uuid {
        &self.id
    }

    fn parent_id(&self) -> Option<Uuid> {
        Some(self.parent_id)
    }

    fn owner_user_id(&self) -> &Uuid {
        &self.owner_user_id
    }

    fn name(&self) -> &str {
        &self.name
    }

    fn resource_type(&self) -> ResourceType {
        ResourceType::Environment
    }

    fn metadata(&self) -> Option<HashMap<String, String>> {
        None
    }

    fn from_storage(parent_id: Option<Uuid>, name: String, resource: serde_json::Value) -> anyhow::Result<Self>
    where
        Self: Sized,
    {
        let environment: Environment = serde_json::from_value(resource)?;
        if Some(environment.parent_id) == parent_id && environment.name == name {
            Ok(environment)
        } else {
            match parent_id {
                Some(parent_id) => Ok(Environment { parent_id, name, ..environment }),
                None => Err(anyhow::anyhow!("Unable to load the environment from the storage")),
            }
        }
    }
}
