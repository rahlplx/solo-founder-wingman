# Base image for the local CI sandbox (scripts/local-ci/run.sh).
#
# Mirrors what .github/workflows/ci.yml gets from ubuntu-latest +
# actions/setup-node@v4 (node-version 22) + ludeeus/action-shellcheck: a
# Node 22 runtime and a shellcheck binary, nothing else pre-installed.
#
# run.sh builds this with a git worktree of the target commit as the build
# context (after copying the harness's own Dockerfile/entrypoint.sh into
# that worktree -- see run.sh for why), so the apt-get layer below stays
# cached across runs and only the final COPY layer changes per commit
# tested.
FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends shellcheck ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
COPY . .

CMD ["bash", "scripts/local-ci/entrypoint.sh"]
