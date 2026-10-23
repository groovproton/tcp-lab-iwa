# Experiment log

## Baseline — awaiting installed IWA test

- Target: Vivaldi 8.2.4133.91 / Chromium 152, macOS ARM64
- IWA + IWA Developer Mode flags: enabled in screenshots
- `vivaldi://web-app-internals` install-from-SWBN control: visible
- Signed bundle: build pipeline implemented; runtime install **NOT YET TESTED**
- TCPSocket runtime existence: **NOT YET TESTED**
- TCP connection result: **NOT YET TESTED**

Record date, app bundle identity, selected host/port, exact visible errors, and whether a socket was actually established.

## Codex build validation — 2026-10-22

- Official Go tools: WICG/webpackage commit `0f06912ca567308165d81fa740d9b315a87b55f5`
- Go `sign-bundle` was confirmed to emit obsolete Integrity Block V1 (3 elements); it is not used for Chromium 152 signing.
- Official Node `wbn-sign@0.3.1` selected for Integrity Block V2 (4 elements), retaining the existing Ed25519 key and Web Bundle ID.
- Vivaldi installation failure: Chromium 152 rejected the Go-generated metadata because it contained `primaryURL: https://tcp-lab.invalid/`.
- Fix: official `wbn@0.0.9` now generates b2 metadata without Primary URL and uses the derived `isolated-app://<WebBundleID>/` resource origin; the manifest remains at `/.well-known/manifest.webmanifest`.
- `make check`: passed
- `make bundle`: passed; generated `dist/tcp-lab.swbn`
- `make verify`: passed; V2 structure, preserved Web Bundle ID, and Ed25519 signatures checked
- Vivaldi install/runtime test: **UNVERIFIED in Codex environment**

## Phase 2 implementation — 2026-10-22

- Added a separate user-triggered `HTTP round-trip` action using only
  `TCPSocket.opened` plus its `ReadableStream` and `WritableStream`.
- The request is plaintext `GET / HTTP/1.1` to the user-selected endpoint,
  defaulting to `example.com:80`; no request occurs on app startup.
- Reads are incremental, capped at 64 KiB, with a 2 KiB decoded preview and a
  bounded overall deadline. Reader/writer locks are released and the socket is
  closed on success, peer closure, errors, and timeout.
- Offline fake-socket coverage: fragmented response, timeout, oversized
  response, and graceful server closure.
- TLS feasibility: the current Direct Sockets specification exposes raw TCP
  streams and options such as buffer sizes, `noDelay`, `keepAliveDelay`, and
  `dnsQueryType`; it does not expose `secureTransport` or `startTls`. WebCrypto
  supplies cryptographic primitives, not a TLS record/handshake implementation,
  certificate-chain validation, SNI, cipher negotiation, or browser trust-root
  integration. A future browser-only experiment would need a carefully audited
  bundled TLS/WASM client and explicit answers for X.509 validation, trust
  roots, RNG, SNI, cipher support, and Atlas requirements.
- Phase 2 runtime gate: **plaintext round-trip requires manual Vivaldi
  verification; TLS remains assessed, not implemented or verified.**

## Phase 3 feasibility — 2026-10-22

- Direct Sockets has no documented native TLS upgrade (`secureTransport` or
  `startTls`); it exposes raw TCP streams only. See `docs/TLS_DESIGN.md`.
- A browser-compatible rustls/WASM engine was not integrated: this workspace
  has no Rust/WASM toolchain, and rustls's standard provider path does not
  currently support WebAssembly. The Emscripten AWS-LC route is experimental
  and does not provide a ready browser trust-store/hostname-validation layer.
- No HTTPS action was added, because claiming success without a validated TLS
  engine would violate the fail-closed requirement.
- Phase 3 status: **BLOCKED at TLS engine/toolchain feasibility; no TLS or
  MongoDB implementation.**

## Manual Vivaldi runtime result — 2026-10-22 (user-observed)

- Signed Web Bundle V2 installed successfully using `vivaldi://web-app-internals`.
- macOS registered `TCP Lab.app` under Vivaldi Apps.
- Runtime: `typeof TCPSocket` = `function`; `typeof UDPSocket` = `function`.
- `crossOriginIsolated` = `true`; `isSecureContext` = `true`.
- User-triggered TCP connect to `example.com:80` succeeded in approximately 553 ms.
- This validates a **TCP connection only**. No application payload read/write or TLS handshake has yet been demonstrated.
- Next experiment: `tasks/PHASE_2.md`.

## Phase 2A — raw HTTP over TCP, verified in Vivaldi (2026-10-22 local / 2026-10-23 UTC)

User-observed runtime results from installed TCP Lab Phase 2 on Vivaldi / macOS ARM64:

- TCP connect: `example.com:80` succeeded (~559 ms in the screenshot log).
- HTTP round-trip via raw TCPSocket streams: **PASS**.
- Status: `HTTP/1.1 200 OK`.
- Bytes read: **932**.
- Elapsed time: **556 ms**.
- Response included HTTP headers (`Transfer-Encoding: chunked`, `Connection: close`) and the Example Domain HTML payload.
- No `fetch()`, browser HTTP API, proxy, backend, or TLS was used for the raw socket request.
- Scope of proof: application-level bidirectional plaintext TCP exchange. TLS, MongoDB protocol, and Atlas connectivity remain unverified.
