use serde::{ Deserialize, Serialize };

#[derive(Serialize, Deserialize)]
pub struct Datasource {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alias: Option<String>,
}
