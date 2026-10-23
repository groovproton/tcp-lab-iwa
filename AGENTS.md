# Codex instructions — TCP Lab IWA

Read `README.md`, `docs/ARCHITECTURE.md`, and `tasks/PHASE_3.md` before modifying Phase 3 code. Keep Phase 1 and Phase 2 tasks as baseline records.

## Mission
Produce a **real, installable Signed Web Bundle** for Vivaldi 8.2 / Chromium 152 on macOS ARM64 and empirically verify Direct Sockets API availability. This is an exploratory browser-native networking project, **not** a MongoDB client yet.

## Hard constraints
- Runtime: bundled HTML, CSS, vanilla JavaScript ES modules, browser APIs only.
- No Node.js backend, no runtime HTTP server, no localhost requirement for the installed IWA, no framework or package.json in app.
- Build-time tools (Go CLI preferred) permitted. Pin their versions and document installation. Avoid a persistent dev proxy as final deliverable.
- No real MongoDB credentials or Atlas access in Phase 1. No external scripts or CDNs.
- Do not silently introduce a different architecture.
- Preserve project layout; maintain `master` as default branch when initializing Git.
- Keep output in `dist/`; private signing keys belong in ignored `keys/`, never commit them.
- Be precise: build validation != runtime success. Record manual Vivaldi results separately.

## Current work item — Phase 3
Phase 2 raw TCP HTTP round-trip has been verified by the user in Vivaldi (`HTTP/1.1 200 OK`, 932 bytes, 556 ms). Implement `tasks/PHASE_3.md`: evaluate a real TLS 1.3 client on top of Direct Sockets, preferably with a maintained WASM TLS library. Fail closed on certificate validation. Preserve existing working P1/P2 tests and the IWA signing identity. Do not add MongoDB or a backend. If a verified TLS engine cannot be integrated, report a reproducible blocker instead of a fake success.

## Acceptance gates
1. `make check` passes.
2. `make bundle` works on Apple Silicon using documented build-time prerequisites.
3. Install through `vivaldi://web-app-internals` → Install IWA from Signed Web Bundle.
4. UI reports `typeof TCPSocket`, `typeof UDPSocket`, `crossOriginIsolated`.
5. A user-triggered TCP attempt reports success/error with time and endpoint, cleans up sockets, and doesn't hang indefinitely.
6. Explicitly state if actual browser test cannot be performed in Codex environment.
