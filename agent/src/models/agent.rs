use serde::{ Serialize, Deserialize };

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub version: &'static str,
}
