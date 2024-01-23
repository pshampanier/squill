#[macro_export]
macro_rules! json_enum {
    ($enum:ident, $($variant:ident),* $(,)?) => {
        #[derive(Serialize, Deserialize, PartialEq, Debug)]
        #[serde(rename_all = "camelCase")]
        enum $enum {
            $($variant,)*
        }
    };
}

#[cfg(test)]
mod tests {
    use serde::{ Deserialize, Serialize };

    json_enum!(TestEnum, ValueA, ValueB);

    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Test {
        value: TestEnum,
    }

    #[test]
    fn test_json_enum() {
        let test = Test {
            value: TestEnum::ValueA,
        };
        let json = serde_json::to_string(&test).unwrap();
        assert_eq!(json, r#"{"value":"valueA"}"#);
        let test: Test = serde_json::from_str(&json).unwrap();
        assert_eq!(test.value, TestEnum::ValueA);
    }
}
