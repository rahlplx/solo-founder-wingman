# Local CI/CD sandbox

Replicates the 3 jobs in `.github/workflows/ci.yml` (JSON validation, the
policy engine test suite on both adapters + typecheck, and ShellCheck on
`founder-os/bin/*.sh`) inside an isolated Docker container, run locally.

## Why this exists

GitHub Actions on this repo currently fails to allocate a runner at all due
to a billing issue on the account -- workflow runs complete in a few
seconds with 404s on job logs, meaning jobs never actually start rather
than genuinely failing. Until that's resolved, this is the merge gate:
**every PR should pass `scripts/local-ci/run.sh` before merging to `main`.**

## Usage

```sh
# Verify the current branch/HEAD
scripts/local-ci/run.sh

# Verify a specific branch or commit
scripts/local-ci/run.sh some-branch-name
scripts/local-ci/run.sh a1b2c3d

# Fetch and verify an open PR's head commit directly
scripts/local-ci/run.sh --pr 5
```

Exits `0` if all 3 checks pass, non-zero otherwise. Output shows each job's
full log followed by a summary table.

## How it works

1. The target ref is resolved to a commit and checked out into a throwaway,
   self-contained local clone (`git clone --local`, not `git worktree add`
   -- a linked worktree's `.git` is just a pointer back to this host's
   `.git/worktrees/...` by absolute path, which breaks any `git` command
   run inside the container once copied there) -- never the caller's
   working directory, so a dirty tree or wrong branch can't leak into the
   result.
2. That clone becomes a Docker build context (`Dockerfile` in this
   directory: `node:22-bookworm-slim` + `shellcheck`, matching what
   `actions/setup-node@v4` and `ludeeus/action-shellcheck` give the
   GitHub-hosted jobs).
3. `entrypoint.sh` runs inside the container and executes the 3 jobs
   independently -- one failing doesn't stop or hide the others, matching
   how GitHub Actions jobs in one workflow run in parallel and report
   separately.
4. The temporary clone and throwaway image are removed afterward
   regardless of outcome.

The harness itself (`Dockerfile`, `entrypoint.sh`) is always taken from the
*current* checkout, not from the ref under test -- so this can verify refs
that predate the sandbox's own existence (it was first used to verify
`main` before this tooling had ever been merged).

## Once GitHub Actions billing is restored

This doesn't need to be removed -- it's a reasonable local pre-push check
either way -- but `.github/workflows/ci.yml` can resume being the actual
merge gate once its jobs report normally again.
