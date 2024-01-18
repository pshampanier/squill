use clap::Parser;
use lazy_static::lazy_static;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
pub struct CommandArgs {
    /// The base directory used to store the files.
    #[arg(short, long)]
    pub base_dir: Option<String>,

    /// The tcpip port to listen to.
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
    &ARGS
}
