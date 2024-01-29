FROM rust:latest

ENV PATH="/usr/local/cargo/bin:${PATH}"

RUN cargo install cargo-tarpaulin
RUN cargo install cargo-audit

RUN chmod -R 777 /usr/local/cargo/registry

# We need to create a user to run the tests (some unit tests are failing if we run them as root)
RUN useradd -m ci
ENV CARGO_BUILD_TARGET_DIR=build
