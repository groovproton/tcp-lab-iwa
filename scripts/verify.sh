#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"
: "${WBN_SIGN:=wbn-sign}"
KEY="$ROOT/keys/tcp-lab-ed25519.pem"
OUTPUT="$ROOT/dist/tcp-lab.swbn"

command -v "$WBN_SIGN" >/dev/null || { echo "wbn-sign not found; see README.md" >&2; exit 1; }
[[ -s "$OUTPUT" ]] || { echo "Missing or empty $OUTPUT; run make bundle" >&2; exit 1; }
[[ -s "$KEY" ]] || { echo "Missing signing key $KEY; run make bundle" >&2; exit 1; }

PACKAGE_DIR=${WBN_SIGN_PACKAGE_DIR:-}
if [[ -z "$PACKAGE_DIR" ]]; then
  SIGNER_BIN=$(command -v "$WBN_SIGN")
  SIGNER_BIN=$(realpath "$SIGNER_BIN" 2>/dev/null || printf '%s' "$SIGNER_BIN")
  PACKAGE_DIR=$(cd "$(dirname "$SIGNER_BIN")/.." && pwd)
fi
node "$ROOT/scripts/verify-v2.mjs" "$OUTPUT" "$KEY" "$PACKAGE_DIR"
