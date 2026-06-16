## AIGX Context

This repository uses [AIGX](https://github.com/Lolner95/AIGX) — a benchmark-validated, per-file context format for AI coding agents.

**Before editing any file:**
1. Open `.aigx/files.aigx` and find the `<file path="...">` entry for the file you're about to edit
2. Read its `<role>` — understand what this file is for
3. Obey its `<forbid pri="CRIT">` — hard constraint, never violate it
4. Heed its `<gotcha>` — the single worst pitfall for this file
5. Verify every id in its `<check>` before finishing

Read `.aigx/protocol.aigx` for the full protocol.

**Keeping the genome current** — from `.aigx/agent.aigx`:
- Rename/move a file → update its `path="..."` in `files.aigx` in the **same change-set**
- Create a new file agents will edit → add a `<file>` entry in `files.aigx`
- Never rename a rule id — update its text in-place

**Validate at any time:**
```bash
python tools/aigx-lint/aigx_lint.py --root .
```
