# TCP Lab — Isolated Web App

Research prototype for **direct TCP networking in Vivaldi/Chromium using JavaScript**. Goal: eventually investigate direct MongoDB Atlas Wire Protocol access, without a local service or a REST proxy. **Phase 1 only tests the Direct Sockets API.**

## Target environment
- Vivaldi 8.2.4133.91 / Chromium 152.0.7977.170
- macOS 26.5, Apple Silicon ARM64
- Flags: Enable Isolated Web Apps, Enable Isolated Web App Developer Mode (already enabled by user)
- Optional Service Worker / Shared Worker Direct Sockets flags are not required by the first version.

## Structure

```text
AGENTS.md                     Codex operating instructions
README.md                     Entry point
Makefile                      check, bundle, verify, clean
app/                          Static runtime only
  .well-known/manifest.webmanifest
  index.html
  css/style.css
  js/main.js
  js/tcp.js
scripts/build.sh              Bundle pipeline handoff to Codex
scripts/verify.sh             Bundle validation handoff
scripts/check.py              Offline static sanity checks
specs/                        (future protocol experiments; not in Phase 1)
tests/test_project.py         Offline tests
docs/ARCHITECTURE.md          Decisions & boundaries
docs/EXPERIMENTS.md           Manual test record
tasks/PHASE_1.md              Codex implementation task
```

## Current state
Runtime test page and TCP probe source are provided. **The `.swbn` bundle is NOT built yet.** Codex needs to implement the packaging/signing scripts using available official tooling. Do not confuse `app/` or a `.zip` with a signed IWA package.

## Codex quick start

```sh
make check
cat tasks/PHASE_1.md
# Implement package signing (scripts/build.sh and verify.sh)
make bundle
make verify
```

## Build prerequisites

The unsigned bundle was initially generated with the official WICG/webpackage
Go reference tools, pinned to commit `0f06912ca567308165d81fa740d9b315a87b55f5`
(Go 1.18+). That generator requires legacy `primaryURL` metadata, which
Chromium 152 rejects for IWAs, so the build now uses the official Node `wbn`
package for packaging instead:

```sh
GOBIN="$HOME/go/bin" go install github.com/WICG/webpackage/go/bundle/cmd/...@0f06912ca567308165d81fa740d9b315a87b55f5
```

This installs `gen-bundle`, `sign-bundle`, and `dump-bundle` for inspection and
historical comparison. The pinned Go
signer emits obsolete Integrity Block V1, so it must not be used for `.swbn`
signing with Chromium 152.

Install the official V2-capable Node signer with Node 22.13+:

```sh
npm install --prefix "$HOME/.local/tcp-lab-wbn-sign" wbn-sign@0.3.1
```

Install the official unsigned bundler alongside it:

```sh
npm install --prefix "$HOME/.local/tcp-lab-wbn-sign" wbn@0.0.9
export PATH="$HOME/.local/tcp-lab-wbn-sign/node_modules/.bin:$PATH"
export WBN_SIGN_PACKAGE_DIR="$HOME/.local/tcp-lab-wbn-sign/node_modules/wbn-sign"
```

`openssl` is used only to create the local Ed25519 key on the first build. The key is stored in
the ignored `keys/` directory; changing it changes the IWA identity, so keep it
for subsequent rebuilds.

`make bundle` uses Node `wbn` with an `isolated-app://<WebBundleID>/` base URL,
then `wbn-sign`, and creates a real Integrity Block V2 signed Web Bundle at
`dist/tcp-lab.swbn`. The resulting b2 metadata has no Primary URL.
`make verify` checks the four-element V2 structure, preserved `webBundleId`,
each Ed25519 signature cryptographically, resource origins, and the required
`/.well-known/manifest.webmanifest` resource. It does not prove Vivaldi
installation.

Use Go build-time tools where practical; project has **no Node.js runtime, npm dependencies or package.json**.

## Installation (once a signed bundle exists)
1. Open `vivaldi://web-app-internals`.
2. Under **Developer Mode**, select **Install IWA from Signed Web Bundle**.
3. Select `dist/tcp-lab.swbn`.
4. Launch TCP Lab, check API availability and press **Test TCP**.
5. Record observed behavior in `docs/EXPERIMENTS.md`.

Do not add Atlas passwords, SRV records, or MongoDB operations at this stage. TCP port 80 on example.com is only a connectivity probe, not a protocol validation.

## Official references
- https://developer.chrome.com/docs/iwa/introduction
- https://developer.chrome.com/docs/iwa/direct-sockets
- https://github.com/WICG/webpackage
