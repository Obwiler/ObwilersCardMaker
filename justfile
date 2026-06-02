# ObwilerCardMaker — 统一命令入口
# 用法: just <recipe>

dev:
    cargo tauri dev

check:
    cargo check && npx tsc --noEmit

health:
    cargo check && npx tsc --noEmit && cargo test -p cardmaker-tag -p cardmaker-parser -p cardmaker-duel && cargo fmt --check && cargo clippy -- -D warnings && pnpm build

test:
    cargo test

test-unit:
    cargo test -p cardmaker-tag -p cardmaker-parser -p cardmaker-duel

fmt:
    cargo fmt && npx prettier --write "src/**/*.{ts,tsx}"

fmt-check:
    cargo fmt --check && npx prettier --check "src/**/*.{ts,tsx}"

lint:
    cargo clippy -- -D warnings

build:
    cargo tauri build

build-apk:
    cargo tauri android build

clean:
    cargo clean && Remove-Item -Recurse -Force target, node_modules -ErrorAction SilentlyContinue