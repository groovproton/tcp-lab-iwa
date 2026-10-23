# PHASE 2 — TCP round-trip and TLS feasibility

## Background (runtime evidence)
On 2026-10-22 local testing on Vivaldi 8.2 / Chromium 152 (macOS ARM64) confirmed:
- IWA installation via signed SWBN succeeded.
- `typeof TCPSocket === "function"`, `typeof UDPSocket === "function"`.
- `crossOriginIsolated === true`, `isSecureContext === true`.
- A user-triggered TCP connect to `example.com:80` succeeded in ~553 ms.

The existing `probeTcp` only opens and closes a socket. It **does not send or read any bytes**.

## Goal
Prove a full application-level request/response round-trip over Direct Sockets. Investigate TLS availability without assuming it exists, and document implications for a later direct MongoDB Atlas connection.

## P2A — HTTP over raw TCP (implementation required)
1. Preserve the existing P1 connect-only probe and its behavior.
2. Add `httpRoundTrip(host, port, timeoutMs)` using only `TCPSocket` and `ReadableStream`/`WritableStream`. No `fetch`, `XMLHttpRequest`, WebSocket, node:net, localhost proxy or backend.
3. Send encoded bytes for a minimal `GET / HTTP/1.1\r\nHost: <hostname>\r\nConnection: close\r\n\r\n` using `TextEncoder`. Use a well-defined public hostname by default (`example.com:80`).
4. Read reply chunks and decode incrementally/safely. Display response status line, total bytes, duration and a bounded response preview. Handle partial reads and binary/malformed data; cap total buffered bytes (e.g. 64 KiB) and preview (e.g. 2 KiB).
5. Provide a **separate** UI button/action `HTTP round-trip` distinct from `Test TCP`. Never contact a remote host on app start. Keep existing diagnostic display.
6. Apply timeouts separately to connect/read or one reliable overall deadline; timeout must break a pending reader, close socket and re-enable UI. Ensure no uncaught/rejected `socket.closed` or leaked stream locks.
7. Explicitly label this as **plaintext HTTP test only**, not TLS/MongoDB.

## P2B — TLS feasibility study (documentation first)
1. Read the current Direct Sockets specification and inspect actual Vivaldi runtime APIs available for this installation.
2. The 2026-07-10 WICG `TCPSocketOptions` lists buffer sizes, `noDelay`, `keepAliveDelay`, `dnsQueryType`; it does **not** specify `secureTransport` or `startTls`. Do not invent browser capabilities.
3. Document viable/infeasible ways to provide TLS over Direct Sockets from browser-only JavaScript (e.g. WebCrypto does not implement TLS framing/handshake; a bundled WASM TLS client might be researched separately), including X.509 validation, SNI, cipher support, RNG, trust roots, and Atlas requirements.
4. **Do not** connect to Atlas in this phase, include credentials, bypass certificate verification, or use `fetch` as a fake TLS-over-socket proof. If a native TLS API is actually observed, record exact evidence before adding implementation.
5. End Phase 2 with a clear gate: plaintext round-trip verified in Vivaldi; TLS path assessed and next experiment identified.

## Tests and build
- Add offline unit tests using a fake TCPSocket and fake streams, covering fragmented HTTP reply, timeout, oversized reply, server closure/error, socket close and resource cleanup. No network required for tests.
- Keep runtime pure vanilla JS and bundled assets only. No `package.json` in app, no backend.
- Preserve Ed25519 signing key, `webBundleId` and build pipeline.
- Bump IWA manifest version appropriately for installed-app update and document how to install/update signed bundle in Vivaldi.
- `make check`, `make bundle`, `make verify` must pass.
- Record manual results in `docs/EXPERIMENTS.md` without claiming Codex can run Vivaldi if it cannot.

## Acceptance criteria
1. P1 connect-only test still works.
2. In installed IWA, user presses `HTTP round-trip`, sees a real `HTTP/1.1 ...` response status line with >0 bytes read from raw TCPSocket (not fetch), correct endpoint, and no hang.
3. Error and timeout scenarios recover the UI and close sockets.
4. Build remains signed, reproducible, installable with unchanged identity.
5. TLS capability statement is evidence-based; Atlas/mongo remain **out of scope**.

## References
- https://developer.chrome.com/docs/iwa/direct-sockets
- https://wicg.github.io/direct-sockets/

## Codex report
Report source changes, test counts, build and verify results, manual Vivaldi update steps, and outstanding TLS blockers. Do not mark browser runtime verified without user's actual observation.
