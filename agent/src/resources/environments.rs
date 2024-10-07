use crate::models::Environment;
use crate::models::ResourceType;
use crate::resources::Resource;
use std::collections::HashMap;
use uuid::Uuid;

impl Resource for Environment {
    fn id(&self) -> Uuid {
        self.id
    }

    fn parent_id(&self) -> Uuid {
        self.parent_id
    }

    fn owner_user_id(&self) -> Uuid {
        self.owner_user_id
    }

    fn name(&self) -> &str {
        &self.name
    }

    fn resource_type(&self) -> ResourceType {
        ResourceType::Environment
    }

    fn metadata(&self) -> HashMap<String, String> {
        HashMap::new()
    }

    fn from_storage(parent_id: Uuid, name: String, resource: serde_json::Value) -> anyhow::Result<Self>
    where
        Self: Sized,
    {
        let environment: Environment = serde_json::from_value(resource)?;
        if environment.parent_id == parent_id && environment.name == name {
            Ok(environment)
        } else {
            Ok(Environment { parent_id, name, ..environment })
        }
    }
}
