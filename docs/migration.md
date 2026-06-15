# Migrating to AIGX

AIGX is designed to **layer on top of** whatever you already have - not to replace it. You don't have to
migrate everything at once. This guide shows the fastest path from a flat `CLAUDE.md` or `AGENTS.md` to a
working genome, with no disruption to the team.

---

## The layering model

```
your repo
├── AGENTS.md          ← keep this; add one line pointing at .aigx/
├── .aigx/             ← new: the genome layer
│   ├── protocol.aigx
│   ├── architecture.aigx
│   └── files.aigx
└── src/
```

Your existing `AGENTS.md` / `CLAUDE.md` continues to work. You just add a line at the top:

> *This repo uses AIGX. Read `.aigx/protocol.aigx` first; for each file you edit, read its `<file>` entry
> in `.aigx/files.aigx` and obey its `<forbid>` and `<check>`.*

---

## Step-by-step migration

### Step 1: Copy the starter and add the one-liner

```bash
cp -r path/to/aigx/templates/starter/.aigx .aigx
```

Add the [agent addendum](../SPEC.md#agent-addendum) to your `AGENTS.md` / `CLAUDE.md` as the first line.
You now have a valid (if empty) genome. The lint check passes; your existing config is unchanged.

### Step 2: Extract your most important rules (30 minutes)

Scan your `AGENTS.md` for the rules that, when an agent ignores them, cause the most pain. Typical
candidates: forbidden imports, data-ownership rules, test policy, money/currency handling.

Move them to a concern file. If your `AGENTS.md` says:

```
Never import from @/features/suppliers/internal - use the barrel at @/features/suppliers/index.ts
TypeScript strict mode; no `any`.
All money in integer cents, never float.
```

Create `.aigx/architecture.aigx`:

```xml
<aigx-architecture>
  <rule id="ARCH-1">Feature barrel pattern: every feature exposes one public index.ts; deep imports are forbidden.</rule>
  <rule id="ARCH-2">TypeScript strict; `any` is forbidden in any form.</rule>
</aigx-architecture>
```

Create `.aigx/data.aigx`:

```xml
<aigx-data>
  <rule id="DATA-1">All monetary values are integer cents; floating-point money is forbidden.</rule>
</aigx-data>
```

### Step 3: Build `files.aigx` for your hot files (1-2 hours)

The most value comes from adding entries for the files where agents most often make mistakes. Start with 5
to 10 files - the ones with import boundaries, subtle data rules, or known traps.

For each, add an entry like:

```xml
<file path="src/features/meetings/bookMeeting.ts" domain="meetings">
  <role>Book a meeting slot (validate + confirm)</role>
  <forbid pri="CRIT">NEVER import @/features/suppliers/internal/* (ARCH-1)</forbid>
  <gotcha pri="CRIT">Get contact_email from the public suppliers barrel, never the internal mapper.</gotcha>
  <check>ARCH-1 ARCH-2 DATA-1</check>
</file>
```

Keep `<forbid>` rare: only files that truly have an import boundary. Scarcity is the point.

### Step 4: Wire up CI

```bash
python tools/aigx-lint/aigx_lint.py --root .
```

A moved file or dangling check id fails the build, so the genome stays honest.

### Step 5: Prune the old flat doc over time

Once a rule is in `.aigx/` with a stable id and a `<check>` reference, you can remove its duplicate from
`AGENTS.md`. Migrate incrementally - there is no deadline.

---

## What stays in AGENTS.md / CLAUDE.md?

Some things belong in a flat file, not a genome:

- **Workflow instructions** ("always run tests before committing") - not rules about code boundaries.
- **Tone / response style** - not codebase rules.
- **The AIGX addendum itself** - the one line that points the agent at `.aigx/`.

AIGX holds the *structural rules* (architecture, data contracts, forbidden imports, hard-correctness
invariants). The flat file holds the *process* context. Both are better when each does its job.

---

## Exporting back to flat formats

Exporters (`aigx → AGENTS.md / CLAUDE.md / .cursor/rules`) are on the
[roadmap](../CHANGELOG.md#unreleased). Until they ship, the genome is your source of truth and your flat
files can reference it via the addendum.
