#!/usr/bin/env bash
# Runs inside the local-ci Docker container (see Dockerfile). Replicates
# the 3 jobs in .github/workflows/ci.yml against whatever commit run.sh
# copied into the image's build context. Each job runs independently (one
# failing doesn't skip or hide the others, matching how GitHub Actions jobs
# in the same workflow run in parallel and report separately) and the
# overall exit code is non-zero if any job failed.
set -uo pipefail

cd /repo

# Trust an extra CA bundle for outbound HTTPS if run.sh carried one into
# the build context (see run.sh) -- needed in sandboxed/corporate
# environments that transparently intercept TLS, e.g. for `npm install`
# below to reach the registry. A normal machine with no such setup gets an
# empty file here and this is a no-op.
CA_FILE="scripts/local-ci/extra-ca.crt"
if [[ -s "$CA_FILE" ]]; then
  cp "$CA_FILE" /usr/local/share/ca-certificates/local-extra.crt
  update-ca-certificates >/dev/null
  export NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/local-extra.crt
fi

declare -A RESULTS

run_job() {
  local name="$1"
  shift
  local log
  log="$(mktemp)"
  echo "=== ${name} ==="
  if "$@" >"$log" 2>&1; then
    RESULTS["$name"]="PASS"
  else
    RESULTS["$name"]="FAIL"
  fi
  cat "$log"
  rm -f "$log"
  echo
}

# Each job_* function is invoked indirectly below via `declare -f` piped
# into `bash -c`, not called directly in this file -- shellcheck can't
# trace that, hence the disable comments on each.

# shellcheck disable=SC2317
job_validate_json() {
  set -e
  # File list lives in scripts/local-ci/jobs.json's validateJsonFiles, also
  # read by .github/workflows/ci.yml's validate-json step -- single source
  # of truth so the two can't drift apart (see
  # founder-os/tests/run-ci-drift-tests.js).
  node -e '
    const jobs = require("./scripts/local-ci/jobs.json");
    for (const f of jobs.validateJsonFiles) {
      console.log("Validating " + f);
      JSON.parse(require("fs").readFileSync(f));
    }
  '
}

# shellcheck disable=SC2317
job_policy_tests() {
  set -e
  npm install --prefix founder-os
  # Reads the same scripts/local-ci/jobs.json used by
  # tests/run-ci-drift-tests.js to assert .github/workflows/ci.yml's steps
  # stay in sync with this list -- previously these were hand-duplicated
  # in both places with nothing keeping them from drifting apart.
  local scripts
  scripts="$(node -e '
    const jobs = require("./scripts/local-ci/jobs.json");
    process.stdout.write(jobs.policyTestsScripts.join("\n"));
  ')"
  while IFS= read -r script; do
    [ -z "$script" ] && continue
    echo "--- npm run $script ---"
    npm run --prefix founder-os "$script"
  done <<<"$scripts"
}

# shellcheck disable=SC2317
job_shellcheck() {
  set -e
  # Directory lives in scripts/local-ci/jobs.json's shellcheckDir; ci.yml's
  # shellcheck job passes the same directory to a GitHub Action input
  # (which, unlike this bash script, can't read jobs.json at runtime), so
  # that side is drift-checked instead of unified -- see
  # founder-os/tests/run-ci-drift-tests.js.
  local dir
  dir="$(node -e 'process.stdout.write(require("./scripts/local-ci/jobs.json").shellcheckDir)')"
  shellcheck "$dir"/*.sh
}

run_job "validate-json" bash -c "$(declare -f job_validate_json); job_validate_json"
run_job "policy-tests" bash -c "$(declare -f job_policy_tests); job_policy_tests"
run_job "shellcheck" bash -c "$(declare -f job_shellcheck); job_shellcheck"

echo "=================================="
echo "Local CI summary"
echo "=================================="
overall=0
for name in "validate-json" "policy-tests" "shellcheck"; do
  status="${RESULTS[$name]}"
  printf "%-16s %s\n" "$name" "$status"
  if [[ "$status" != "PASS" ]]; then
    overall=1
  fi
done

exit "$overall"
