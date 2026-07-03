{
  // Copy into the founder's project root as opencode.jsonc when the founder
  // is using OpenCode (not Claude Code) as their agent. Replace
  // {{FOUNDER_OS_PATH}} with wherever founder-os actually lives relative to
  // this project (e.g. a sibling directory, or an absolute path if vendored
  // elsewhere).
  //
  // The `plugin` entry alone only wires up the safety hook (policy.json
  // enforcement) -- OpenCode's skill loader does NOT auto-discover an
  // external plugin's skills/ directory the way Claude Code does, so
  // `skills.paths` is required too, or none of founder-os's skills (BRIEF,
  // PATH, HIRE, etc.) will be available at all. Verified live: with only
  // `plugin` set, `opencode debug skill` finds zero founder-os skills;
  // adding `skills.paths` makes all of them appear.
  //
  // (Plain opencode.json can't hold this comment -- OpenCode rejects any
  // unrecognized top-level key, including a `$comment` field, with a hard
  // config error. opencode.jsonc is the supported config filename that
  // actually tolerates comments; use this filename, not opencode.json.)
  //
  // See FAILURE-MODES.md for what's still not reachable under OpenCode
  // even with this file in place: the 3 bundled subagents and 5 commands.
  // OpenCode has no equivalent path-override for those, only fixed
  // .opencode/agent/ and .opencode/command/ directories or inline
  // definitions in this file.
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["{{FOUNDER_OS_PATH}}/adapters/opencode/plugin.ts"],
  "skills": {
    "paths": ["{{FOUNDER_OS_PATH}}/skills"]
  }
}
