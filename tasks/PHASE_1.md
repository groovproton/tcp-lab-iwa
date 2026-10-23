# PHASE 1 — Reproducible signed IWA + TCP proof

## Objective
Deliver a self-contained and installable `dist/tcp-lab.swbn` for Vivaldi on macOS ARM64. Prototype source under `app/` is already provided; fix incompatibilities found during real verification.

## Work
1. Check manifest at `app/.well-known/manifest.webmanifest` for current Chromium IWA schema, including `permissions_policy` with `direct-sockets` and `cross-origin-isolated` set to `["self"]`.
2. Pick the smallest reliable signed-web-bundle tooling. Prefer Go reference tooling from `github.com/WICG/webpackage/go/bundle` or an equivalent official documented workflow. **Build tools may be installed**, but do not add Node/npm to app runtime.
3. Implement `scripts/build.sh` (bundle + sign; `dist/tcp-lab.swbn`) and `scripts/verify.sh` (check integrity/signature if tooling supports; reject missing/empty/malformed file). Avoid opaque downloaded binaries and floating tool versions.
4. Create/load signing identity only on user's machine, inside gitignored `keys/`; never overwrite an existing key. Document that changing key changes IWA origin.
5. Keep a clean developer loop: `make check`, `make bundle`, `make verify`, `make clean`. Add useful failure messages.
6. Validate UI behavior in an installed IWA if browser runtime available. Otherwise hand exact manual test checklist to user, label it UNVERIFIED.
7. Log outcomes and limitations in `docs/EXPERIMENTS.md`.

## Acceptance criteria
- `make check` passes.
- `make bundle && make verify` passes on target Mac.
- IWA installs through Vivaldi `web-app-internals` from the signed bundle.
- Diagnostics surface actual values of Direct Sockets constructors.
- Clicking Test TCP either connects and closes, or surfaces a precise failure; no indefinite busy state.
- No MongoDB, no backend, no package.json, no network operations on page load.

## Not in scope
MongoDB Wire Protocol, SCRAM, DNS SRV, credentials, Chrome extension messaging, hosted REST proxy, persistence, continuous background service.

## Handoff format
Report: commands run, artifacts generated, tests passed, manual steps needed, unexpected browser restrictions.
