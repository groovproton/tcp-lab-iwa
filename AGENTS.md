# Codex instructions — TCP Lab IWA

Read `README.md`, `docs/ARCHITECTURE.md`, and `tasks/PHASE_2.md` before modifying Phase 2 code. Keep `tasks/PHASE_1.md` as the baseline record.

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

## Current work item — Phase 2
Phase 1 has been installed and TCP connected in Vivaldi (user-observed). Implement `tasks/PHASE_2.md` next: prove HTTP request/response bytes using TCPSocket and investigate native TLS feasibility. Retain signed-bundle identity, do not implement MongoDB, and do not claim Phase 2 runtime verification before user tests.

## Acceptance gates
1. `make check` passes.
2. `make bundle` works on Apple Silicon using documented build-time prerequisites.
3. Install through `vivaldi://web-app-internals` → Install IWA from Signed Web Bundle.
4. UI reports `typeof TCPSocket`, `typeof UDPSocket`, `crossOriginIsolated`.
5. A user-triggered TCP attempt reports success/error with time and endpoint, cleans up sockets, and doesn't hang indefinitely.
6. Explicitly state if actual browser test cannot be performed in Codex environment.
