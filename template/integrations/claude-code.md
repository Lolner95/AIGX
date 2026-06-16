## AIGX — AI Genome Exchange

This repository stores its AI agent rules in `.aigx/` — a structured genome with a per-file boundary index. You do not need to guess conventions; they are in the genome.

### Before editing any file — look it up

Open `.aigx/files.aigx` and find the `<file path="...">` entry for the file you are about to edit:

```xml
<file path="src/features/auth/login.ts" domain="auth">
  <role>Handle login — validate credentials and issue a session</role>
  <forbid pri="CRIT">NEVER read from another tenant's session store</forbid>
  <gotcha>token expiry is checked at read-time, not issue-time</gotcha>
  <check>ARCH-no-deep-imports ENG-tenant-scope</check>
</file>
```

- **`<role>`** — understand what this file is for before writing a line
- **`<forbid pri="CRIT">`** — hard constraint, never violate it, no exceptions
- **`<gotcha>`** — the single worst pitfall for this file; read it twice
- **`<check>`** — space-separated rule ids; look each up in its concern file and verify they hold before finishing

The concern files are `.aigx/architecture.aigx` (ARCH-* rules), `.aigx/data.aigx` (DATA-*), `.aigx/engineering.aigx` (ENG-*), etc. Read the ones your check ids reference **before** writing code.

### Genome structure

```
.aigx/
  protocol.aigx      ← full reading sequence
  product.aigx       ← product context + freshness clause (which old docs are stale)
  architecture.aigx  ← ARCH-* architectural rules
  engineering.aigx   ← ENG-* hard-correctness invariants
  files.aigx         ← ★ per-file boundary index — look files up here
  agent.aigx         ← self-maintenance rules (this section summarises them)
  [concern].aigx     ← any other concern files present (data, auth, testing, …)
```

### Keeping the genome current

**Rename/move a file** that has a `files.aigx` entry → update `path="..."` in the **same change-set**. A rename without a genome update is an incomplete change.

**Create a new file** agents will edit → add a `<file>` entry in `files.aigx` with at least `<role>` + one `<check>` id. Never leave a new boundary file without an entry.

**Rule ids are permanent** — `ARCH-no-deep-imports`, `ENG-2`, etc. Never rename or delete them. Update the text in-place only.

**Code change makes a rule incorrect** → update the rule text in the same change-set. The genome describes reality, not history.

**After renames, moves, deletes, or adds:** verify every `<file path>` in `files.aigx` still exists and every `<check>` id resolves to a real rule.

**Never add entries speculatively.** One rule per real constraint. One entry per file agents actually edit.

### Validate

```bash
python tools/aigx-lint/aigx_lint.py --root .
```
