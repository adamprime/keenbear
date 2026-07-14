---
name: sol-worker
description: Delegates bounded implementation work to GPT-5.6 Sol via the Codex CLI. Use when the user asks to hand implementation work to Sol/Codex while Claude owns the plan and review.
---

# Sol worker

Delegate a settled implementation brief to GPT-5.6 Sol running in the Codex CLI. You (Claude) own the plan, any scope changes, and the final review — Sol only implements.

## Steps

1. Write the full brief to `.agent/sol-brief.md`, creating the directory if needed. The brief must be self-contained: repo context, diagnosed root causes, exact scope, out-of-scope list, test command, and required report format (changed files + test output).
2. Run: `codex exec -m gpt-5.6-sol -C "$PWD" - < .agent/sol-brief.md`
3. When it finishes, review the changed files with `git diff` against the brief. Run the project tests yourself — do not trust the report alone.
4. Report to the user: what Sol changed, whether it matched the brief, test results, and anything that needed correction.

## Notes

- Requires the Codex CLI installed and signed in (`codex login`).
- Do not let Sol commit; commits go through the normal git workflow after review.
- `.agent/` is scratch space — do not commit it.
