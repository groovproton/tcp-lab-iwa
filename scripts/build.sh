#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"
: "${WBN_BUNDLE:=wbn}"
: "${WBN_SIGN:=wbn-sign}"
: "${WBN_DUMP_ID:=wbn-dump-id}"
KEY="$ROOT/keys/tcp-lab-ed25519.pem"
DIST="$ROOT/dist"
UNSIGNED="$DIST/tcp-lab.wbn"
OUTPUT="$DIST/tcp-lab.swbn"

command -v "$WBN_BUNDLE" >/dev/null || { echo "wbn not found; see README.md for pinned tool installation" >&2; exit 1; }
command -v "$WBN_SIGN" >/dev/null || { echo "wbn-sign not found; see README.md for pinned tool installation" >&2; exit 1; }
command -v "$WBN_DUMP_ID" >/dev/null || { echo "wbn-dump-id not found; see README.md for pinned tool installation" >&2; exit 1; }
command -v openssl >/dev/null || { echo "openssl is required to create the Ed25519 signing key" >&2; exit 1; }
mkdir -p "$DIST" "$ROOT/keys"

if [[ ! -s "$KEY" ]]; then
  echo "Creating signing identity at keys/tcp-lab-ed25519.pem (keep this file for rebuilds)"
  umask 077
  openssl genpkey -algorithm Ed25519 -out "$KEY"
fi
chmod 600 "$KEY"

rm -f "$UNSIGNED" "$OUTPUT"
ID=$("$WBN_DUMP_ID" -k "$KEY")
ORIGIN="isolated-app://${ID}/"
"$WBN_BUNDLE" -d "$ROOT/app" -b "$ORIGIN" -o "$UNSIGNED"
"$WBN_SIGN" sign "$UNSIGNED" "$KEY" -o "$OUTPUT"
rm -f "$UNSIGNED"
[[ -s "$OUTPUT" ]] || { echo "sign-bundle did not create a non-empty $OUTPUT" >&2; exit 1; }
echo "Created $OUTPUT"
