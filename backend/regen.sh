#!/usr/bin/env bash
# Regenerate gqlgen code for this repo.
#
# Why this script exists: this project keeps every real resolver in a per-module
# graph/<module>.resolvers.go file, but gqlgen's follow-schema layout only knows
# about graph/schema.resolvers.go. On every run it re-dumps ALL resolvers into
# schema.resolvers.go, which then collide with the module files, so gqlgen's
# final validation exits non-zero. That's expected and harmless: gqlgen still
# writes graph/generated.go correctly before the validation step.
#
# So we run gqlgen, ignore that validation failure, restore schema.resolvers.go
# from the stub template kept beside it, and confirm the package builds.
#
# graph/schema.resolvers.go.stub is the source of truth for that file. It holds
# the only resolvers with nowhere else to live (health, _placeholder). Restoring
# from a template rather than from whatever happened to be on disk matters: a
# run that starts from an already-clobbered file would otherwise adopt the
# 16k-line dump as the new "stub" and never recover.
#
# IMPORTANT: implement new resolvers in a module file, never in
# schema.resolvers.go — this script overwrites it on every run. If a resolver
# genuinely belongs there, add it to the .stub template.
set -uo pipefail
cd "$(dirname "$0")"

STUB=graph/schema.resolvers.go.stub
TARGET=graph/schema.resolvers.go

if [ ! -s "$STUB" ]; then
  echo "FATAL: $STUB is missing or empty. It is the only copy of the stub;"
  echo "       restore it from version control before regenerating."
  exit 1
fi

# gqlgen must be the version the module pins, or generated.go drifts against
# the runtime. `go run` resolves it from go.mod, so there is nothing to install
# and no assumption about where a binary landed (GOPATH is not always ~/go).
gqlgen() {
  if command -v gqlgen >/dev/null 2>&1; then
    command gqlgen "$@"
  else
    go run github.com/99designs/gqlgen "$@"
  fi
}

echo "==> gqlgen generate (validation failure on duplicates is expected)"
# gqlgen always exits non-zero here, so `|| true` would hide a genuine failure
# (bad schema, missing tool) just as effectively as the harmless one. The
# duplicate-resolver case is identified by name instead: only that specific
# validation error is tolerated, and anything else stops the run.
#
# Output is captured to inspect, then echoed back so a real failure is still
# readable in the terminal.
set +e
GEN_OUT="$(gqlgen generate 2>&1)"
GEN_RC=$?
set -e
printf '%s\n' "$GEN_OUT"

if [ "$GEN_RC" -ne 0 ] && ! grep -q "validation failed" <<<"$GEN_OUT"; then
  echo
  echo "FAILED: gqlgen exited $GEN_RC for a reason other than the expected"
  echo "        duplicate-resolver validation error. graph/generated.go may be"
  echo "        stale or half-written — read the output above before rerunning."
  exit 1
fi

echo "==> restoring $TARGET from $STUB"
# Written through the existing file rather than moved over it: `mv` has to
# unlink the target first, which fails on a read-restricted or synced checkout
# and would leave the clobbered file in place, silently.
cat "$STUB" > "$TARGET"

echo "==> go build ./..."
if go build ./...; then
  echo "OK: regenerated and builds cleanly."
else
  echo "BUILD FAILED: a real compile error remains (not the gqlgen duplicate issue)."
  echo "              If it names a duplicate resolver, that resolver is in the"
  echo "              stub template AND a module file — remove it from the stub."
  exit 1
fi
