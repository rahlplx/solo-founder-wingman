#!/usr/bin/env bash
# Local CI/CD sandbox for founder-os.
#
# Replicates the 3 jobs in .github/workflows/ci.yml (validate-json,
# policy-tests, shellcheck) inside an isolated Docker container, so PRs can
# be verified without depending on GitHub-hosted Actions runners -- which,
# as of this writing, fail to allocate at all due to a billing issue on the
# repo owner's account (workflow runs complete in ~4s with 404s on job
# logs, meaning the runner never actually started).
#
# Isolation: the target ref is checked out into a throwaway `git worktree`
# (never the caller's working directory, which may be dirty or on an
# unrelated branch), then that worktree becomes the Docker build context --
# so the container only ever sees a clean, reproducible copy of exactly the
# commit being verified, matching what a fresh GitHub-hosted runner would
# start from.
#
# Usage:
#   scripts/local-ci/run.sh                # verify the current branch/HEAD
#   scripts/local-ci/run.sh <branch-or-sha> # verify a specific ref
#   scripts/local-ci/run.sh --pr <number>   # fetch and verify a PR's head
#
# Exit code is 0 iff all 3 jobs passed.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

PR_NUMBER=""
REF=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pr)
      PR_NUMBER="$2"
      shift 2
      ;;
    -h|--help)
      sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      REF="$1"
      shift
      ;;
  esac
done

if [[ -n "$PR_NUMBER" ]]; then
  echo "Fetching PR #${PR_NUMBER}..."
  git fetch origin "refs/pull/${PR_NUMBER}/head" >/dev/null
  REF="FETCH_HEAD"
elif [[ -z "$REF" ]]; then
  REF="HEAD"
fi

SHA="$(git rev-parse "$REF")"
SHORT_SHA="${SHA:0:12}"
echo "Verifying commit ${SHA} (${REF})"

WORKTREE_DIR="$(mktemp -d -t founder-os-local-ci-XXXXXX)"
IMAGE_TAG="founder-os-local-ci:${SHORT_SHA}"

# Invoked indirectly via `trap ... EXIT` below -- shellcheck can't trace
# that, hence the disable comment.
# shellcheck disable=SC2317
cleanup() {
  docker image rm -f "$IMAGE_TAG" >/dev/null 2>&1 || true
  git worktree remove --force "$WORKTREE_DIR" >/dev/null 2>&1 || true
  rm -rf "$WORKTREE_DIR" 2>/dev/null || true
}
trap cleanup EXIT

echo "Creating isolated worktree at ${WORKTREE_DIR}..."
git worktree add --detach --quiet "$WORKTREE_DIR" "$SHA"

# The harness (Dockerfile/entrypoint.sh) always comes from the *current*
# checkout, not from the target ref -- this is what lets run.sh verify
# refs that predate the sandbox's own existence (e.g. `main`, before this
# tooling was merged), and keeps a single harness version in play instead
# of whatever copy happens to be sitting on the ref under test.
mkdir -p "$WORKTREE_DIR/scripts/local-ci"
cp "$SCRIPT_DIR/Dockerfile" "$SCRIPT_DIR/entrypoint.sh" "$WORKTREE_DIR/scripts/local-ci/"

# If this host trusts an extra CA bundle for outbound HTTPS (common in
# sandboxed/corporate environments that transparently intercept TLS -- see
# NODE_EXTRA_CA_CERTS), carry it into the build context so the container's
# npm install can reach the registry too. On a machine with no such setup
# this ends up as an empty file and entrypoint.sh skips trusting it.
CA_BUNDLE_DEST="$WORKTREE_DIR/scripts/local-ci/extra-ca.crt"
if [[ -n "${NODE_EXTRA_CA_CERTS:-}" && -f "${NODE_EXTRA_CA_CERTS}" ]]; then
  cp "${NODE_EXTRA_CA_CERTS}" "$CA_BUNDLE_DEST"
else
  : > "$CA_BUNDLE_DEST"
fi

echo "Building sandbox image..."
docker build --quiet -t "$IMAGE_TAG" -f "$WORKTREE_DIR/scripts/local-ci/Dockerfile" "$WORKTREE_DIR" >/dev/null

echo "Running local CI..."
echo
set +e
docker run --rm "$IMAGE_TAG"
STATUS=$?
set -e

echo
if [[ "$STATUS" -eq 0 ]]; then
  echo "Local CI: ALL CHECKS PASSED (${SHA})"
else
  echo "Local CI: ONE OR MORE CHECKS FAILED (${SHA})"
fi

exit "$STATUS"
