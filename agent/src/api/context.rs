#[derive(Clone, Debug)]
struct Context {
    db: Database,
    user: Option<User>,
}
