## Code coverage

[![codecov](https://codecov.io/gh/pshampanier/one-sql/graph/badge.svg?token=DNCTZ1WPTF)](https://codecov.io/gh/pshampanier/one-sql)

The crate [`cargo-tarpaulin`](https://crates.io/crates/cargo-tarpaulin) is used for code coverage.

### Installation

Tarpaulin is a command-line program, you install it into your linux development environment with cargo install:

```bash
cargo install cargo-tarpaulin
```

### Running

```bash
cargo tarpaulin && open build/tarpaulin-report.html
```

A github action [agent-coverage.yml](../.github/workflows/agent-coverage.yml) is configured to be run on every push on the `main` branch and results are published on [codecov.io](https://app.codecov.io/gh/pshampanier/one-sql).
