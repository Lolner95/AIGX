# AIGX Genome Context

This repository uses [AIGX](https://github.com/Lolner95/AIGX) for structured agent context. Read the genome before writing code.

## Reading Protocol

For every file you are about to edit:

1. Open `.aigx/files.aigx` and find the `<file path="...">` entry for that file
2. Read its `<role>` — understand what it's for
3. Obey `<forbid pri="CRIT">` — hard never-violate constraint
4. Heed `<gotcha>` — the single worst thing to get wrong here
5. Verify every rule id in `<check>` before finishing

Read `.aigx/protocol.aigx` for the full reading sequence. Read the concern files (`.aigx/architecture.aigx`, `.aigx/data.aigx`, etc.) that the check ids reference.

## Genome Self-Maintenance

See `.aigx/agent.aigx` for the complete rules. The most important:

- When you **rename or move a source file**: update its `path` attribute in `files.aigx` in the **same change-set**
- When you **create a new source file** that agents will edit: add a `<file>` entry in `files.aigx` with `<role>` + at least one `<check>` id
- **Rule ids are the cross-reference backbone** — never rename or delete them; update the text in-place only

## Validation

```bash
python tools/aigx-lint/aigx_lint.py --root .
```
