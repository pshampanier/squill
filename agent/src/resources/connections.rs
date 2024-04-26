use crate::models::connections::Connection;
use crate::resources::Resource;

impl Resource for Connection {
    fn id(&self) -> &str {
        self.id.as_str()
    }

    fn name(&self) -> &str {
        self.name.as_str()
    }
}

impl Connection {
    pub fn new(name: String) -> Connection {
        Connection {
            id: uuid::Uuid::new_v4().to_string(),
            alias: "conn".to_string(),
            name,
            save_password: false,
            ..Default::default()
        }
    }
}
