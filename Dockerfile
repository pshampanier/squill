FROM rust:latest

ENV PATH="/usr/local/cargo/bin:${PATH}"

# Install the required dependencies for tauri
# https://tauri.app/v1/guides/getting-started/prerequisites/#setting-up-linux
RUN apt-get update && apt-get install -y \
  libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

RUN rustup component add rustfmt
RUN cargo install cargo-audit

RUN chmod -R 777 /usr/local/cargo/registry

# We need to create a user to run the tests (some unit tests are failing if we run them as root)
RUN useradd -m ci
RUN echo '. /usr/local/cargo/env' >> /home/ci/.profile
RUN echo 'function chpwd() {'  >> /home/ci/.profile && \
    echo '  if [[ -x .env.sh ]]; then'  >> /home/ci/.profile && \
    echo '    source .env.sh'  >> /home/ci/.profile && \
    echo '  fi'  >> /home/ci/.profile && \
    echo '}'  >> /home/ci/.profile
