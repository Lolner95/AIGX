# AGENTS.md

This repository uses **AIGX (AI Genome Exchange)** — its AI-agent rules live in a `.aigx/` directory with a
per-file boundary index. You don't need to guess the conventions; they are in the genome. Read this section
before editing.

## The reading protocol — do this for every task

1. **Read `.aigx/protocol.aigx`** first — it is the authoritative reading sequence.
2. **For EACH file you will edit, open `.aigx/files.aigx`** and find its `<file path="...">` entry:

   ```xml
   <file path="src/features/auth/login.ts" domain="auth">
     <role>Handle login — validate credentials and issue a session</role>
     <forbid pri="CRIT">NEVER read from another tenant's session store</forbid>
     <gotcha>token expiry is checked at read-time, not issue-time</gotcha>
     <check>ARCH-no-deep-imports ENG-tenant-scope</check>
   </file>
   ```

   - **`<role>`** — what this file is for; understand it before writing a line.
   - **`<forbid pri="CRIT">`** — a hard constraint. Never violate it, no exceptions.
   - **`<gotcha>`** — the single worst pitfall for this file; read it twice.
   - **`<check>`** — space-separated rule ids. Look each up in its concern file and **verify they hold
     before you finish.**

3. **Read the concern files your check ids reference** — `.aigx/architecture.aigx` (`ARCH-*`),
   `.aigx/engineering.aigx` (`ENG-*`), `.aigx/data.aigx` (`DATA-*`), etc. — *before* writing code.
4. **Make the minimal change** with a local blast radius, then **verify every `<check>` id** for each file
   you touched.

## Keep the genome current (you are a steward of it)

- **Rename/move a file** that has a `files.aigx` entry → update its `path="..."` in the **same change-set**.
- **Create a new file** other agents will edit → add a `<file>` entry (at least `<role>` + one `<check>`).
- **Rule ids are permanent** (`ARCH-no-deep-imports`, `ENG-2`, …) — never rename or delete; edit text in place.
- **A code change that makes a rule wrong** → fix the rule text in the same change-set. The genome describes
  reality, not history.

## Validate

```bash
aigx lint        # or: python tools/aigx-lint/aigx_lint.py --root .
```

> Full format: <https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.md>
