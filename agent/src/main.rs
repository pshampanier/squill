use std::process::exit;

mod commandline;
mod settings;
mod error;

fn main() {
    println!("{} {}", env!("CARGO_PKG_DESCRIPTION"), env!("CARGO_PKG_VERSION"));

    let args = commandline::get_args();
    if args.show_config {
        let settings = settings::get_settings();
        println!("{settings}");
        exit(0);
    }
}
