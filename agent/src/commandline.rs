use std::net::Ipv4Addr;
use clap::{ Parser, Subcommand };
use lazy_static::lazy_static;

#[derive(Parser)]
#[command(author, version, about = None, long_about = None)]
pub struct Args {
    /// The base directory used to store the files.
    #[arg(short, long)]
    pub base_dir: Option<String>,

    /// Use verbose output
    #[clap(long, short)]
    pub verbose: bool,

    /// Print the final configuration.
    #[arg(long, default_value_t = false)]
    pub show_config: bool,

    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Debug, Subcommand)]
pub enum Commands {
    /// Start the server.
    Start {
        /// The TCP/IP address to listen to.
        #[arg(long)]
        listen_address: Option<Ipv4Addr>,

        /// Set the API Key expected in the X-API-Key header.
        #[arg(long)]
        api_key: Option<String>,

        /// The TCP/IP port to listen to.
        #[arg(short, long)]
        port: Option<u16>,
    },
    /// Create a new user account.
    UserAdd {
        /// The username of the user to add.
        username: String,
    },
    /// Delete a user account and all associated data.
    UserDel {
        /// The username of the user to delete.
        username: String,
    },

    /// Print the final configuration.
    ShowConfig,
}

lazy_static! {
    static ref ARGS: Args = Args::parse();
}

pub fn get_args() -> &'static Args {
    if cfg!(test) {
        &(Args {
            base_dir: None,
            verbose: false,
            show_config: false,
            command: Commands::Start {
                listen_address: None,
                api_key: None,
                port: None,
            },
        })
    } else {
        &ARGS
    }
}
