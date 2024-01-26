FROM rust:latest

ENV PATH="/usr/local/cargo/bin:${PATH}"

RUN cargo install cargo-tarpaulin
RUN chmod -R 777 /usr/local/cargo/registry

RUN useradd -m ci
USER ci
ENV CARGO_BUILD_TARGET_DIR=/tmp/x86_64-unknown-linux-gnu
WORKDIR /home/ci
