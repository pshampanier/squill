#[macro_export]
macro_rules! json_enum {
    ($enum:ident, $($variant:ident),* $(,)?) => {
        #[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
        #[serde(rename_all = "snake_case")]
        pub enum $enum {
            $($variant,)*
        }
    };
}

/// For each property of the AgentSettings struct, generate a getter function.
///
/// The generated function will return the value of the property from the global SETTINGS static variable. In test mode,
/// the generated function will return a value from the thread local variable SETTINGS, allowing to override the value.
#[macro_export]
macro_rules! settings_getters {
    ($($getter:ident, $field:ident: $type:ty),* $(,)?) => {
        $(
            pub fn $getter() -> $type {
                #[cfg(not(test))]
                {
                    SETTINGS.$field.clone()
                }
                #[cfg(test)]
                $crate::utils::tests::settings::SETTINGS.with(|settings| { settings.borrow().$field.clone() })
            }
        )*
    };
}

#[cfg(test)]
mod tests {
    use serde::{ Deserialize, Serialize };

    json_enum!(TestEnum, ValueA, ValueB);

    #[derive(Serialize, Deserialize, Clone)]
    #[serde(rename_all = "snake_case")]
    struct Test {
        value: TestEnum,
    }

    #[test]
    fn test_json_enum() {
        let test = Test {
            value: TestEnum::ValueA,
        };
        let json = serde_json::to_string(&test).unwrap();
        assert_eq!(json, r#"{"value":"value_a"}"#);
        let test: Test = serde_json::from_str(&json).unwrap();
        assert_eq!(test.value, TestEnum::ValueA);
    }
}
