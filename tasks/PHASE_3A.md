# PHASE 3A — TLS engine selection (unblock study)

## Context
Phase 3 feasibility identified no documented native TLS mode in WICG Direct Sockets and did not implement/fake TLS. P1/P2 IWA TCP tests are browser-verified. Missing Rust toolchain is not by itself proof that TLS cannot work.

## Goal
Choose a realistic browser-runnable TLS engine before implementing a production-credential-carrying TLS client. Keep the existing Vivaldi IWA architecture and signing identity.

## Candidates
1. **node-forge**: inspect the official maintained package/source, version, licensing, supported protocol versions, cipher suites, browser packaging, documented `forge.tls.createConnection` byte-based callbacks, SNI and certificate verification. Determine whether it actually interoperates with `example.com:443` and Atlas's TLS policies. Treat it only as a candidate; historical sample code includes weak/deprecated ciphers and examples disabling verification. Do not copy those settings.
2. **rustls + wasm-compatible crypto provider**: find an evidenced working build target/provider. Do not assume `ring` or AWS-LC works in browser WASM by default. Installing/pinning Rust build tooling is permitted; no runtime backend.
3. Optionally evaluate a maintained C/OpenSSL/BoringSSL-style WASM client if better documented, with license and binary-size implications.

## Deliverable: docs/TLS_ENGINE_SELECTION.md
- Table: library + pinned version, TLS 1.2/1.3, modern cipher suites, browser/WASM feasibility, trust-chain validation, SAN hostname check, SNI, entropy, security maintenance, dependencies and bundle size.
- State Atlas compatibility as VERIFIED / UNKNOWN / INCOMPATIBLE from evidence.
- Explicitly distinguish compilation, handshake, certificate validation and encrypted application-data round-trip.
- Recommend one minimal proof-of-concept and detail the exact API bridge between `TCPSocket` streams and TLS ciphertext/plaintext.
- If feasible, implement an **isolated, opt-in prototype** without modifying verified P1/P2 paths. Never bypass certificate validation. If it cannot be done properly, provide evidence of the blocker instead.
- No MongoDB credentials or MongoDB protocol in this task.

## Tests
- Existing `make check`, `make bundle`, `make verify` must remain green.
- Record build/test evidence and clear runtime UNVERIFIED status unless user tests in Vivaldi.
- Preserve Ed25519 key, app ID and offline signed runtime.
