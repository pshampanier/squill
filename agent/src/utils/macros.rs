#[macro_export]
macro_rules! json_enum {
    ($enum:ident, $($variant:ident),* $(,)?) => {

        #[derive(Serialize, Deserialize)]
        #[serde(rename_all = "camelCase")]
        enum $enum {
            $($variant,)*
        }

        impl std::str::FromStr for $enum {
            type Err = ();

            fn from_str(s: &str) -> Result<Self, Self::Err> {
                match s {
                    $(
                        stringify!($variant) => Ok($enum::$variant),
                    )*
                    _ => Err(()),
                }
            }
        }
    };
}
