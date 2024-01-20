use std::process::exit;

mod commandline;
mod settings;
mod server;

#[tokio::main]
async fn main() {
    println!(
        "{} {} (pid={})",
        env!("CARGO_PKG_DESCRIPTION"),
        env!("CARGO_PKG_VERSION"),
        std::process::id()
    );

    let args = commandline::get_args();
    let settings = settings::get_settings();

    if args.show_config {
        println!("{settings}");
        exit(0);
    }

    let server = server::Server {};
    match server.run(settings).await {
        Ok(_) => {}
        Err(error) => {
            println!("Error: {}", error);
            exit(1);
        }
    }
}
