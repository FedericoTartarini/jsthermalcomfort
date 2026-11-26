#!/usr/bin/env bash
# Fails when PyPI's latest pythermalcomfort release differs from the parity pin
# in requirements.in, naming both (docs/agents/upstream-sync.md).
set -euo pipefail

pin=$(sed -n 's/^pythermalcomfort==//p' "$(dirname "$0")/requirements.in")
if [ -z "$pin" ]; then
  echo "requirements.in has no pythermalcomfort==<version> line" >&2
  exit 1
fi

# info.version is the newest release, preferring one not yanked, then one not a
# prerelease (pypi/warehouse main, warehouse/legacy/api/json.py:235-239,
# latest_release_factory, fetched 2026-11-04).
latest=$(curl -fsSL https://pypi.org/pypi/pythermalcomfort/json | jq -er .info.version)

if [ "$latest" != "$pin" ]; then
  echo "PyPI's latest pythermalcomfort is $latest; the parity pin is $pin. Retarget per docs/agents/upstream-sync.md." >&2
  exit 1
fi
echo "PyPI's latest pythermalcomfort is $latest, the parity pin."
