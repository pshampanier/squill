# Identification of the Target
#
# The target is the platform that the application will be built for.
# - arch = The base CPU architecture, for example x86_64, i686, arm, thumb, mips, etc.
# - sys = The operating system, for example linux, windows, macos, ios, android, etc.
# - vendor = The vendor, for example unknown, apple, pc, nvidia, etc.
local target=$(rustc -Vv | grep host | cut -f2 -d' ')

BUILD_DIR=${PWD}/build
export SQUILL_APP_DIR=${BUILD_DIR}/app_dir
export CARGO_BUILD_TARGET_DIR=${BUILD_DIR}/${target}

# Add the debug build directory to the PATH
if ! echo $PATH | grep -q "${CARGO_BUILD_TARGET_DIR}/debug"; then
    export PATH=${CARGO_BUILD_TARGET_DIR}/debug:$PATH
fi

function codecov() {
  export LLVM_PROFILE_FILE=rsql-%p-%m.profraw
  export RUST_BACKTRACE=1
  export RUST_LOG="info"
  export RUST_LOG_SPAN_EVENTS=full
  export RUSTFLAGS=-Cinstrument-coverage
  export RUSTDOCFLAGS=-Cinstrument-coverage

  cargo test --package=agent && \
  grcov $(find ./agent -name "rsql-*.profraw" -print) \
    -s ./agent \
    --branch \
    --ignore-not-existing \
    --ignore='/*' \
    --binary-path ${CARGO_BUILD_TARGET_DIR} \
    --excl-line='#\[derive' \
    -t html \
    -o ${CARGO_BUILD_TARGET_DIR}
}

function clean() {
  local profile_files=($(find . -name "rsql-*.profraw" -print))
  for file in "${profile_files[@]}"; do
    rm $file
  done
  [ -f "lcov.info" ] && rm lcov.info
}

function build {
  local target="$1"
  case $target in
    "agent")
      shift
      cargo build --bin agent $@
      ;;

    "all"|"")
      cargo build
      ;;

    *)
      echo "Unknown target: $target"
      ;;
  esac
}

# All the Vite environment variables are exported, this will be used by the agent when starting the server in 
# development mode (agent start --dev)
for vite_env in $(cat ./client/.env.local | grep VITE_); do
  export $(echo $vite_env | cut -f1 -d=)=$(echo $vite_env | cut -f2 -d=)
done

alias agent-dev="build agent && agent --verbose start --dev"
alias package="cargo tauri build"