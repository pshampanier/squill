use std::net::Ipv4Addr;
use clap::Parser;
use lazy_static::lazy_static;

#[derive(Parser)]
#[command(author, version, about = None, long_about = None)]
pub struct CommandArgs {
    /// The base directory used to store the files.
    #[arg(short, long)]
    pub base_dir: Option<String>,

    /// The TCP/IP address to listen to.
    #[arg(long)]
    pub listen_address: Option<Ipv4Addr>,

    /// Set the API Key expected in the X-API-Key header.
    #[arg(long)]
    pub api_key: Option<String>,

    /// The TCP/IP port to listen to.
    #[arg(short, long)]
    pub port: Option<u16>,

    /// Use verbose output
    #[clap(long, short)]
    pub verbose: bool,

    /// Print the final configuration.
    #[arg(long, default_value_t = false)]
    pub show_config: bool,
}

lazy_static! {
    static ref ARGS: CommandArgs = CommandArgs::parse();
}

pub fn get_args() -> &'static CommandArgs {
    if cfg!(test) {
        &(CommandArgs {
            base_dir: None,
            listen_address: None,
            api_key: None,
            port: None,
            verbose: false,
            show_config: false,
        })
    } else {
        &ARGS
    }
}
