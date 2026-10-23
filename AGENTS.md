# Codex instructions — TCP Lab IWA

Read `README.md`, `docs/ARCHITECTURE.md`, and `tasks/PHASE_1.md` before modifying code.

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

## First work item
Complete `tasks/PHASE_1.md`. Replace the placeholder `scripts/build.sh` with a working reproducible SWBN build/sign flow; ensure `make bundle` produces `dist/tcp-lab.swbn`, `make verify` checks that file. Use the same signing key for rebuilds, as key changes alter IWA identity.

## Acceptance gates
1. `make check` passes.
2. `make bundle` works on Apple Silicon using documented build-time prerequisites.
3. Install through `vivaldi://web-app-internals` → Install IWA from Signed Web Bundle.
4. UI reports `typeof TCPSocket`, `typeof UDPSocket`, `crossOriginIsolated`.
5. A user-triggered TCP attempt reports success/error with time and endpoint, cleans up sockets, and doesn't hang indefinitely.
6. Explicitly state if actual browser test cannot be performed in Codex environment.
