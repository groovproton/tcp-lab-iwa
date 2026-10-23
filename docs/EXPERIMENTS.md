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

## Manual Vivaldi runtime result — 2026-10-22 (user-observed)

- Signed Web Bundle V2 installed successfully using `vivaldi://web-app-internals`.
- macOS registered `TCP Lab.app` under Vivaldi Apps.
- Runtime: `typeof TCPSocket` = `function`; `typeof UDPSocket` = `function`.
- `crossOriginIsolated` = `true`; `isSecureContext` = `true`.
- User-triggered TCP connect to `example.com:80` succeeded in approximately 553 ms.
- This validates a **TCP connection only**. No application payload read/write or TLS handshake has yet been demonstrated.
- Next experiment: `tasks/PHASE_2.md`.
