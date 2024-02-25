## Build

### Environment variables

-   [`CARGO_BUILD_TARGET_DIR`](https://doc.rust-lang.org/cargo/reference/config.html#buildtarget-dir): the path to where all compiler output is placed. This is a combination of the architecture and the operating system (e.g. `aarch64-apple-darwin`).

    | Operating Systems | Architecture    |
    | ----------------- | --------------- |
    | unknown-linux-gnu | x86_64, aarch64 |
    | apple-darwin      | x86_64, aarch64 |
    | pc-windows-msvc   | x86_64, aarch64 |

## Code coverage

[![codecov](https://codecov.io/gh/pshampanier/squill/graph/badge.svg?token=DNCTZ1WPTF)](https://codecov.io/gh/pshampanier/squill)

The crate [`cargo-tarpaulin`](https://crates.io/crates/cargo-tarpaulin) is used for code coverage.

### Installation

Tarpaulin is a command-line program, you install it into your linux development environment with cargo install:

```bash
cargo install cargo-tarpaulin
```

### Running

```bash
cargo tarpaulin --target-dir=${CARGO_BUILD_TARGET_DIR} && open build/tarpaulin-report.html
```

A github action [agent-coverage.yml](../.github/workflows/agent-coverage.yml) is configured to be run on every push on the `main` branch and results are published on [codecov.io](https://app.codecov.io/gh/pshampanier/squill).

# Github actions

## Testing Github actions

> [!IMPORTANT]
> Install [`act`](https://github.com/nektos/act).

```sh
act --workflows .github/workflows/agent.yml
```
