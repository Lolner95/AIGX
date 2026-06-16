# AIGX — AI Genome Exchange

This repository stores its AI agent rules in `.aigx/` — a structured genome with a per-file boundary index. You do not need to guess conventions; they are in the genome.

## Before editing any file — look it up

Open `.aigx/files.aigx` and find the `<file path="...">` entry for the file you are about to edit:

```xml
<file path="src/features/auth/login.ts" domain="auth">
  <role>Handle login — validate credentials and issue a session</role>
  <forbid pri="CRIT">NEVER read from another tenant's session store</forbid>
  <gotcha>token expiry is checked at read-time, not issue-time</gotcha>
  <check>ARCH-no-deep-imports ENG-tenant-scope</check>
</file>
```

**What to do with each field:**

- `<role>` — read it to understand the file's job before writing a line
- `<forbid pri="CRIT">` — hard constraint, never violate it, no exceptions
- `<gotcha>` — the single worst pitfall here; read it twice  
- `<check>` — rule ids you must verify hold before declaring done; look each up in its concern file

## The genome structure

```
.aigx/
  protocol.aigx      ← full reading sequence (read if in doubt)
  product.aigx       ← product context + freshness clause (overrides stale docs)
  architecture.aigx  ← ARCH-* architectural rules
  data.aigx          ← DATA-* data-integrity rules   (if present)
  auth.aigx          ← AUTH-* authorization rules    (if present)
  engineering.aigx   ← ENG-* hard-correctness invariants
  files.aigx         ← ★ per-file boundary index (the keystone — look files up here)
  agent.aigx         ← self-maintenance rules for agents
  [concern].aigx     ← any other concern files (testing, performance, security, …)
```

Check ids reference rules in concern files: `ARCH-no-deep-imports` is defined in `architecture.aigx` as `<rule id="ARCH-no-deep-imports">`. Read the rule before writing code.

## Keeping the genome current

**Rename or move a file** that has a `files.aigx` entry → update its `path="..."` attribute in the **same change-set**. A rename without a genome update is an incomplete change.

**Create a new source file** agents will edit → add a `<file>` entry in `files.aigx`. Minimum: `<role>` + one `<check>` id. Never leave a new boundary file undocumented.

**Rule ids are permanent.** Never rename or delete `ARCH-no-deep-imports`, `ENG-2`, or any other id — they are the cross-reference backbone. Update the rule text in-place if the meaning changes.

**Code change makes a rule incorrect** → update the rule text in the same change-set. The genome must reflect the current codebase, not history.

**After renames, moves, deletes, or adds:** verify every `<file path>` in `files.aigx` still exists and every `<check>` id resolves.

**Never add entries speculatively.** One rule per real constraint. One entry per file agents actually edit. Lean genomes outperform rich ones.

## Validation

```bash
python tools/aigx-lint/aigx_lint.py --root .
```
