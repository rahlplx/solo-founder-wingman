# Scaffolded by founder-os. AGENTS.md tells the agent (and you) that secrets
# should never be committed -- this file is what actually makes that true by
# default, instead of relying on everyone remembering every time.

# Secrets -- never commit real credentials
.env
.env.local
.env.*.local
!.env.example

# Dependencies
node_modules/
.pnp
.pnp.js

# Build output
dist/
build/
.next/
out/

# Logs
*.log
npm-debug.log*

# OS/editor noise
.DS_Store
.vscode/
.idea/

# Test/coverage output
coverage/
