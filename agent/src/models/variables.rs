use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum VariableValue {
    Text(String),
    Boolean(bool),
    Date(String),
    Timestamp(String),
    Float(f64),
    Integer(i64),
    Secret(String),
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Variable {
    /// The name of the variable
    pub name: String,

    /// The value of the variable
    pub value: Option<VariableValue>,

    /// The description of the variable
    pub description: String,
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_variable() {
        use super::*;
        let variable = Variable {
            name: "test".to_string(),
            value: Some(VariableValue::Text("test".to_string())),
            description: "test".to_string(),
        };
        let variable_json = serde_json::to_string_pretty(&variable).unwrap();
        print!("{}", variable_json);
    }
}
