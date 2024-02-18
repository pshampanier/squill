use serde::{ Serialize, Deserialize };

#[derive(Serialize, Deserialize, Debug)]
pub struct ResponseError {
    pub status: u16,
    pub code: String,
    pub message: String,
}
