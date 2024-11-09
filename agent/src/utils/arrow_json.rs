use arrow_integration_test::data_type_to_json;
use arrow_schema::{DataType, Field, Schema};
use serde_json::Value;

// This code is copied from the Arrow project and modified to fix the an issue with metadata serialization.
// https://github.com/apache/arrow-rs/issues/6700

fn field_to_json(field: &Field) -> serde_json::Value {
    let children: Vec<serde_json::Value> = match field.data_type() {
        DataType::Struct(fields) => fields.iter().map(|x| field_to_json(x.as_ref())).collect(),
        DataType::List(field)
        | DataType::LargeList(field)
        | DataType::FixedSizeList(field, _)
        | DataType::Map(field, _) => vec![field_to_json(field)],
        _ => vec![],
    };

    match field.data_type() {
        DataType::Dictionary(ref index_type, ref value_type) => serde_json::json!({
            "name": field.name(),
            "nullable": field.is_nullable(),
            "type": data_type_to_json(value_type),
            "children": children,
            "dictionary": {
                "id": field.dict_id().unwrap(),
                "indexType": data_type_to_json(index_type),
                "isOrdered": field.dict_is_ordered().unwrap(),
            }
        }),
        _ => serde_json::json!({
            "name": field.name(),
            "nullable": field.is_nullable(),
            "type": data_type_to_json(field.data_type()),
            "children": children,
            "metadata": serde_json::to_value(field.metadata()).unwrap()
        }),
    }
}

pub fn schema_to_json(schema: &Schema) -> Value {
    serde_json::json!({
        "fields": schema.fields().iter().map(|f| field_to_json(f.as_ref())).collect::<Vec<_>>(),
        "metadata": serde_json::to_value(schema.metadata()).unwrap()
    })
}

#[cfg(test)]
mod tests {
    use super::schema_to_json;
    use arrow_schema::{DataType, Field, Schema};
    use std::collections::HashMap;

    #[test]
    fn test_schema_to_json() {
        let metadata = [("key1".to_string(), "value1".to_string())].iter().cloned().collect::<HashMap<_, _>>();
        let fields = vec![Field::new("a", DataType::Int32, true).with_metadata(metadata.clone())];
        let schema = Schema::new(fields).with_metadata(metadata.clone());
        let json = schema_to_json(&schema);
        assert_eq!(
            serde_json::to_string_pretty(&json).unwrap(),
            serde_json::to_string_pretty(&serde_json::json!({
                "fields": [
                    {
                        "name": "a",
                        "nullable": true,
                        "type": {
                            "name": "int",
                            "bitWidth": 32,
                            "isSigned": true
                        },
                        "children": [],
                        "metadata": {
                            "key1": "value1"
                        },
                    },
                ],
                "metadata": {
                    "key1": "value1"
                },
            }))
            .unwrap()
        );
    }
}
