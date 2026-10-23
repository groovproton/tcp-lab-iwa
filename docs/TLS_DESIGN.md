# Phase 3 TLS feasibility

## Result

Phase 3 stops before shipping a TLS engine. No native TLS upgrade is exposed
by the Direct Sockets API used by this IWA, and no maintained, browser-ready
TLS/WASM dependency could be compiled and tested reproducibly in the current
workspace. The app therefore does not add an HTTPS button or claim TLS support.

This is an intentional fail-closed result: there is no insecure mode, no
certificate bypass, and no `fetch()` fallback.

## Direct Sockets evidence

The current WICG Direct Sockets interface exposes `TCPSocket.opened`,
`TCPSocket.closed`, `close()`, and raw readable/writable streams. Its options
cover send/receive buffers, `noDelay`, `keepAliveDelay`, and `dnsQueryType`.
There is no `secureTransport`, `startTls`, TLS configuration, certificate
validation, SNI, or trust-store API. The installed Phase 1/2 runtime
diagnostics also expose only `TCPSocket` and `UDPSocket` constructors; the
Codex environment cannot perform the required installed-Vivaldi experiment.

Reference: https://wicg.github.io/direct-sockets/

## Candidate engine assessment

### rustls

- Candidate: rustls 0.23.x, MIT/Apache-2.0, TLS 1.2 and TLS 1.3.
- Intended integration: a small Rust/WASM adapter would own a rustls
  `ClientConnection`; JavaScript would feed encrypted socket bytes to
  `read_tls()`/`process_new_packets()` and drain ciphertext/plaintext through
  the corresponding streams.
- Required provider: an actually wasm-compatible cryptographic provider,
  browser entropy source, and a WASM ABI with bounded buffers and cancellation.
- Blocker: current rustls documentation says WebAssembly is not presently
  supported by its standard provider path. The default aws-lc-rs path is not a
  `wasm32-unknown-unknown` browser solution; its documented WebAssembly route
  is experimental Emscripten with additional runtime/security considerations.
- This workspace has no `cargo`, `rustc`, `rustup`, `wasm-bindgen`, or
  `wasm-pack`, so a pinned compile/test cannot be performed here.

### Alternative: OpenSSL/BoringSSL-derived WASM

An Emscripten build could provide TLS 1.3, but it introduces a substantially
larger native-crypto/WASM surface, an Emscripten runtime ABI, browser entropy
and trust-store integration work, and additional audit/licensing/build
complexity. It is not a smaller or more reproducible next step for this IWA.

## Required design before implementation

The next experiment should provision a pinned Rust toolchain and a maintained
WASM-compatible rustls provider, then prove an offline fixture handshake before
adding browser transport. The adapter must define:

- SNI and hostname matching against the requested endpoint.
- Certificate-chain validation against an explicitly packaged, reproducible
  root set and a documented update process.
- Browser entropy from `crypto.getRandomValues` bridged into the engine.
- TLS 1.3 negotiation, alerts, EOF, fragmented records, partial writes,
  backpressure, cancellation, and bounded memory/time.
- A test fixture for valid certificates, expired/untrusted certificates, and
  hostname mismatch. Invalid cases must fail closed.

Until those checks pass locally and in Vivaldi, HTTPS over Direct Sockets is
not implemented.
