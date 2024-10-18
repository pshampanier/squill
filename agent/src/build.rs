use openapi_codegen::{rustfmt, Context, Generator};
use std::fs::read_to_string;
use std::path::PathBuf;
use yaml_rust::YamlLoader;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

fn save_to_file(output_file: &str, code: &str) -> Result<()> {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let output_file = PathBuf::from(manifest_dir).join(output_file);
    if output_file.exists() {
        let previous_code = read_to_string(&output_file)?;
        if previous_code == code {
            return Ok(());
        }
    }
    std::fs::write(output_file, code).map_err(|e| Box::<dyn std::error::Error>::from(e) as Box<dyn std::error::Error>)
}

fn init_code_generator() -> Result<(Generator<'static>, Context)> {
    let openapi = YamlLoader::load_from_str(include_str!("../api.yaml"))?;
    let generator = Generator::from_templates(vec![
        ("rust/macros", include_str!("../assets/build/rust/macros.j2")),
        ("typescript/macros", include_str!("../assets/build/typescript/macros.j2")),
    ])?;
    if openapi.len() != 1 {
        return Err("Invalid OpenAPI definition".into());
    }
    Ok((generator, Context::from(&openapi[0])))
}

fn main() {
    built::write_built_file().expect("Failed to acquire build-time information");
    let (generator, context) = init_code_generator().expect("Failed to initialize code generator");

    macro_rules! rust_codegen {
        ($template:expr) => {
            generator
                .render_string(include_str!(concat!("../assets/build/rust/", $template, ".j2")), &context)
                .and_then(rustfmt)
                .and_then(|code| save_to_file(concat!("src/models/", $template, ".rs"), &code))
                .unwrap_or_else(|e| panic!("Failed to process '{}': {}", concat!("rust/", $template, ".j2"), e));
        };
    }

    macro_rules! typescript_codegen {
        ($template:expr) => {
            generator
                .render_string(include_str!(concat!("../assets/build/typescript/", $template, ".j2")), &context)
                .and_then(|code| save_to_file(concat!("../client/src/models/", $template, ".ts"), &code))
                .unwrap_or_else(|e| panic!("Failed to process '{}': {}", concat!("typescript/", $template, ".j2"), e));
        };
    }

    rust_codegen!("queries");
    rust_codegen!("auth");
    rust_codegen!("push_notifications");
    rust_codegen!("dataframes");
    rust_codegen!("drivers");
    rust_codegen!("connections");
    rust_codegen!("resources");
    rust_codegen!("collections");
    typescript_codegen!("queries");
    typescript_codegen!("auth");
    typescript_codegen!("push-notifications");
    typescript_codegen!("dataframes");
    typescript_codegen!("drivers");
    typescript_codegen!("connections");
    typescript_codegen!("collections");
    typescript_codegen!("resources");
}
