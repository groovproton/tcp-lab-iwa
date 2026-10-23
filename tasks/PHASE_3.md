# PHASE 3 — Browser-native TLS over Direct Sockets

## Mission
Investigate and, if feasible, implement a **verified TLS 1.3 client over the already working TCPSocket streams**. Test against a public HTTPS endpoint before attempting MongoDB Atlas. Keep no backend, relay, proxy, localhost runtime, browser fetch-as-transport, or credentials.

## Verified baseline
- Vivaldi 8.2 / Chromium 152, Apple Silicon macOS.
- Phase 1: native TCPSocket connect to example.com:80 passed.
- Phase 2: native TCP HTTP round-trip returned `HTTP/1.1 200 OK`, 932 bytes in 556 ms (user-observed).
- Signed IWA build identity must not change.

## Phase 3A — Feasibility and minimal TLS engine
1. Confirm from current WICG Direct Sockets spec and runtime that there is no supported native TLS upgrade on TCPSocket. If an API exists, cite its exact interface, version and experimentally validate it before choosing an implementation.
2. Investigate a maintained, browser-WASM-capable TLS engine, **prefer rustls** backed by an actually wasm-compatible cryptographic provider. Do not assume vanilla rustls + ring compiles to wasm32-unknown-unknown or that WebCrypto implements TLS.
3. Produce `docs/TLS_DESIGN.md` detailing dependency versions/licenses, compile target, entropy source, TLS 1.3 support, browser/WASM runtime integration, memory/time budget, certificate validation, trusted root source/update strategy, SNI/hostname matching, alert handling, and limitations. Compare at least one realistic alternative.
4. Implement a small, independently testable TLS transport adapter bridging encrypted TCP bytes to/from the TLS engine and exposing plaintext read/write. Handle backpressure, fragmented records, partial writes, EOF/alerts, cancellation, bounded buffers, timers and cleanup. Keep TLS library implementation isolated from UI and TCP transport.
5. Avoid rolling bespoke crypto or disabling certificate verification. If no viable audited/maintained TLS implementation can be compiled, stop at a documented evidence-backed blocker rather than faking TLS.

## Phase 3B — Real HTTPS-over-TLS test
1. Add a separate user-triggered `HTTPS over TCP/TLS` action; retain P1 connect-only and P2 plaintext HTTP round-trip unchanged.
2. Connect to `example.com:443` via `new TCPSocket('example.com',443)`. Feed its raw readable/writable streams into the TLS engine.
3. Perform a TLS 1.3 handshake with SNI `example.com`; require certificate-chain + hostname validation against pinned/reproducible publicly trusted root certificates. Fail closed on invalid/expired/untrusted certs. Never allow an insecure mode to make the acceptance test pass.
4. Send `GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n` **inside the validated TLS channel**. Collect a bounded response preview (2 KiB), cap total response (64 KiB), show status line, bytes, elapsed time, negotiated TLS version/cipher if available, and certificate verification result.
5. Bound handshake + I/O time, prevent startup network access, log failures without secrets, and close socket/streams correctly on all paths.
6. Crucial: HTTP over ordinary `fetch('https://...')` is **not** success and must not be used as a transport or fallback. No WebSocket relays or third-party TLS-as-a-service.
7. Do not connect to MongoDB Atlas or implement MongoDB Wire Protocol yet.

## Tests / packaging
- Build-time Rust/Cargo and wasm tooling are allowed if pinned, documented and reproducible. Runtime must remain self-contained IWA HTML/CSS/JS/WASM; no Node runtime, local daemon or package.json in app.
- Unit/integration tests with fragmented TLS records, close/timeout/error paths, invalid certificate and hostname mismatch. Local/offline test fixtures may be used during build; no runtime test server.
- Keep identity: Ed25519 signing key and Web Bundle ID unchanged. Update IWA manifest version, package .wasm/assets with correct MIME and `isolated-app://` resource origin, and extend `make verify`.
- Run `make clean`, `make check`, `make bundle`, `make verify`; preserve reproducibility where feasible.
- Codex should explicitly distinguish locally tested crypto/fixtures from real browser TLS, which only the user can validate in Vivaldi.
- Update `docs/EXPERIMENTS.md` with commands, results and known limitations.

## Acceptance gate
**PASS** only after installed TCP Lab demonstrates direct TCP + validated TLS handshake + decrypted `HTTP/1.1 200 OK` from `example.com:443` on Vivaldi (or equivalent genuine response/status), with proof no fetch/relay/proxy was used. Otherwise mark the specific blocker and provide the smallest next diagnostic experiment.

## Follow-on phase (NOT part of Phase 3)
MongoDB Atlas SRV/seedlist, OP_MSG/BSON, SCRAM, find/update/upsert and integration with Google Translate.
