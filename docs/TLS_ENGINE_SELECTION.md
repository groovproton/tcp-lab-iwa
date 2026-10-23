# Phase 3A — TLS engine selection

## Decision

`@joclaim/tls@0.3.2` is the selected proof-of-concept engine. It is a pure
TypeScript/JavaScript implementation with browser-targeted WebCrypto support,
TLS 1.2/1.3, X.509 validation, SNI via `host`, and a Mozilla CA store. Its
license is a custom license from the upstream project and must be reviewed
before production use.

The engine is bundled into `app/js/tls-engine.js` and isolated behind
`app/js/tls.js`. The default UI does not import or invoke it yet; Phase 1/2
actions remain unchanged. The adapter bridges `TCPSocket.opened` streams to
the engine's `write`, `handleReceivedBytes`, and application-data callbacks,
with a bounded timeout, response cap, and cleanup.

To reproduce the vendor bundle outside the app, install Node 22.13+ and run:

```sh
npm install --prefix /private/tmp/tcp-lab-iwa-node-tools @joclaim/tls@0.3.2 esbuild@0.25.8
node --input-type=module <<'NODE'
import * as esbuild from '/private/tmp/tcp-lab-iwa-node-tools/node_modules/esbuild/lib/main.js';
await esbuild.build({
  stdin: { contents: `export { makeTLSClient, setCryptoImplementation } from '@joclaim/tls'; export { webcryptoCrypto } from '@joclaim/tls/webcrypto';`, resolveDir: '/private/tmp/tcp-lab-iwa-node-tools' },
  bundle: true, format: 'esm', platform: 'browser', minify: true,
  outfile: 'app/js/tls-engine.js', legalComments: 'inline'
});
NODE
```

## Candidate comparison

| Engine | Version/license | TLS | Browser feasibility | Validation/SNI | Concrete result |
|---|---|---|---|---|---|
| `@joclaim/tls` | 0.3.2 / upstream custom license | 1.2, 1.3 | Browser API, WebCrypto; P-256/P-384 browser curves | Mozilla roots, X.509 chain, hostname via `host` | **Selected**; Node TLS 1.3 + HTTP proof passed |
| `node-forge` | 1.3.2 / BSD-3-Clause | TLS implementation is legacy; no TLS 1.3 cipher constants | Browser JavaScript | Callback/CA store/SNI available, but unsafe examples exist | Handshake/HTTP passed only with verification bypass; fail-closed trust test rejected |
| rustls | 0.23.x / MIT/Apache-2.0 | 1.2, 1.3 | Requires a browser-compatible provider/WASM build | Strong design, but provider/toolchain integration unresolved | Not compiled here; no `cargo`/`rustc` installed |
| libcurl.js | 0.7.4 / LGPL-3.0 | Up to 1.3 | WASM, but uses WebSocket/Wisp transport | Not a direct `TCPSocket` adapter; proxy architecture | Rejected: violates no-relay architecture |

Atlas compatibility is **UNKNOWN**. No Atlas connection or credentials were
used. `example.com:443` compatibility proves only a public HTTPS handshake and
HTTP response, not MongoDB TLS policy compatibility.

## Evidence

The pinned `node-forge` experiment reported no TLS 1.3 cipher constants. It
negotiated `TLS_RSA_WITH_AES_128_CBC_SHA` only when the verification callback
returned `true` despite `forge.pki.UnknownCertificateAuthority`. With an empty
CA store and the callback returning the library's verification result, the
handshake failed closed. It is not selected.

The selected engine was bundled for `platform: browser` with esbuild 0.25.8:

- output: 565,596 bytes minified ESM including dependencies
- 258 bundled input modules
- zero Node runtime dependencies in the bundle build

The dependency contains an AIA intermediate-fetch path using `fetch()` when a
chain is incomplete. The `example.com` proof supplied the full four-certificate
chain, so that path was not needed. This is a remaining security/architecture
review item before enabling the adapter in the UI.

Node proof-of-concept, with `verifyServerCertificate: true`, produced:

- TLS version: `TLS1_3`
- cipher: `TLS_CHACHA20_POLY1305_SHA256`
- certificate chain: 4 certificates, verified
- encrypted response: `HTTP/1.1 200 OK`, 926 bytes

This is compilation and Node interoperability evidence, not browser runtime
evidence. The bundled app adapter still requires an installed Vivaldi test.

## Bridge and fail-closed rules

1. Open `TCPSocket(host, 443)` and await `opened`.
2. Give the engine the returned readable/writable streams.
3. Forward each encrypted readable chunk to `handleReceivedBytes`.
4. Forward each engine ciphertext write to the socket writer.
5. Permit application data only after `verifyServerCertificate: true` and the
   engine handshake callback.
6. Bound handshake/read time and response bytes; cancel readers and close the
   socket on all paths.

The adapter is opt-in and not wired into the UI until a Vivaldi browser test
confirms `example.com:443` with the same certificate-validation behavior.
