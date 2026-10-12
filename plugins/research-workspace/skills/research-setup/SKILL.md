---
name: research-setup
description: Initialize or reconnect a project's file-based Research Workspace for Codex and Claude Code without changing global agent configuration.
---

# Set up project memory

Determine the target project directory and research topic from the request. Keep an existing repository layout intact.

Locate this installed plugin: this skill directory is `skills/research-setup/`; the plugin root is two directories above it. Run its bundled `scripts/research.mjs` with an absolute, quoted path:

```text
node "<plugin-root>/scripts/research.mjs" --project "<project-root>" init --topic "<research question>" --constraints "<agreed constraints>"
```

This creates `.research/`, a project-local CLI launcher, and a marked guidance block in project `AGENTS.md` and `CLAUDE.md`, preserving other contents. It does not install the plugin globally or edit host settings. Re-running init rebinds the launcher to the current plugin location without clearing history; it does not change an existing topic/constraints.

Verify from that project root:

```text
node ".research/research.mjs" context
node ".research/research.mjs" doctor
```

Explain which project files were added/modified. Research metadata can be tracked in Git; ignore private/sensitive records and large artifacts according to project policy. Do not automatically hide all research memory or upload it.

An existing Oh My Paper `.pipeline/` is not automatically migrated. Leave it intact. If migration is requested, review the records and register verified sources/runs explicitly; do not turn historical prose into fabricated successful runs.
