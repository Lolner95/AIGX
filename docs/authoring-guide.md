# Authoring Guide - Write a Genome for Your Codebase

A practical, opinionated walkthrough. Target: a working genome in an afternoon. Everything here is backed
by the [principles](principles.md); when in doubt, **keep it short**.

## Step 0 - Copy the starter

```bash
cp -r path/to/aigx/templates/starter/.aigx .aigx
```

You'll edit these files in place. Look at the [full worked example](../examples/sourcing-app/) alongside -
it's a real genome for a non-trivial app.

## Step 1 - Write your rules, namespaced by concern

Create one file per concern in `.aigx/`: `architecture.aigx`, `data.aigx`, `auth.aigx`, `testing.aigx`,
`performance.aigx`, … Each rule gets a **stable id**:

```xml
<aigx-architecture>
  <rule id="ARCH-no-deep-imports">Every feature exposes ONE public API: its index barrel. Deep imports are forbidden.</rule>
  <rule id="ARCH-ts-strict">TypeScript strict; `any` is forbidden in any form.</rule>
  <rule id="ARCH-feature-slice">Feature-sliced design: each feature owns its components, logic, internal modules.</rule>
</aigx-architecture>
```

**Rule id format — numeric vs. semantic:**

AIGX supports two id styles; both are valid and you can mix them freely in one genome:

| Style | Example | When to use |
|---|---|---|
| `PREFIX-N` (numeric) | `ARCH-2` | Migrating an existing genome; short sequential rules |
| `PREFIX-slug` (semantic) | `ARCH-no-deep-imports` | New genomes (recommended); makes `<check>` lists self-documenting |

Semantic ids make `<check>` entries in `files.aigx` readable at a glance:
```xml
<!-- check list with numeric ids -->
<check>ARCH-2 ARCH-6 DATA-3 TEST-1</check>

<!-- same rules with semantic ids -->
<check>ARCH-no-deep-imports ARCH-ts-strict DATA-integer-cents TEST-failing-first</check>
```

**The only invariant:** once assigned, an id is permanent. You can update the rule *text* in-place; you may not rename or delete the id (see [agent.aigx](.aigx/agent.aigx) rule `AGENT-stable-ids`).

**Do:** one clear sentence per rule. Stable, namespaced ids. Semantic slugs for new rules.
**Don't:** essays, rationale paragraphs, or duplicating a rule across concerns.

## Step 2 - Build the per-file boundary index (the keystone)

This is where AIGX earns its keep. In `.aigx/files.aigx`, add one `<file>` entry for **each file an agent
is likely to touch**:

```xml
<file path="src/features/meetings/bookMeeting.ts" domain="meetings">
  <role>Book a meeting (validate slot + contact)</role>
  <forbid pri="CRIT">NEVER import @/features/suppliers/internal/* (deep import = ARCH-2)</forbid>
  <gotcha pri="CRIT">get contact_email from the suppliers PUBLIC api, never the internal mapper</gotcha>
  <check>ARCH-2 ARCH-4 DATA-2 TEST-1</check>
</file>
```

The four fields, and how to fill them well:

- **`<role>`** - one line. What is this file *for*?
- **`<forbid>`** - a hard NEVER. **Use sparingly.** Only files with a genuine import boundary get one.
  Scarcity is the point: if everything is forbidden, nothing is. (In our 35-file example, only **4** files
  carry a `<forbid>`.)
- **`<gotcha>`** - the **single** worst pitfall for this file. Not a list. The one thing a careless edit
  gets wrong here.
- **`<check>`** - the rule-ids the agent must verify before finishing. These are your finish line.

> **The #1 mistake:** over-stuffing the index. More fields, more forbids, longer gotchas - all tested, all
> failed to help, some hurt. Lean wins.

## Step 3 - Write the read protocol

`.aigx/protocol.aigx` - one screen. You can use the [starter](../templates/starter/.aigx/protocol.aigx)
nearly as-is; it already says the right thing: *read each edited file's index entry, obey its forbid,
verify its checks, schema-first/test-first/minimal-blast.*

## Step 4 - Add product context + a freshness clause

`.aigx/product.aigx`: what the product is, what "good" means, and - crucially - a `<freshness>` line that
**supersedes stale docs**:

```xml
<freshness>Direction was reset in Feb 2026. Anything dated earlier (including docs/OLD_README.md) is
 historical and yields to this genome.</freshness>
```

This single line resolves a whole class of "the agent followed an outdated doc" failures.

## Step 5 - Add per-domain cards (optional but recommended)

Next to each feature folder, drop a `<key>.aigx` card with purpose, public API, test policy, blast radius,
and a few rule-tagged facts. See any card in the [example](../examples/sourcing-app/src/features/).

## Step 6 - Wire up your agent (one line)

Add the [agent addendum](../SPEC.md#agent-addendum) to your existing `AGENTS.md` / `CLAUDE.md` /
`.cursor/rules` / system prompt. Done.

---

## A checklist before you commit

- [ ] Every `<check>` id resolves to a real `<rule id>` in a concern file.
- [ ] `<forbid>` appears on **only** the few files with a real import boundary.
- [ ] Each `<file>` entry has **at most one** `<gotcha>`.
- [ ] Rules are one sentence each; no essays.
- [ ] `product.aigx` has a `<freshness>` clause if you have any stale docs.
- [ ] Nothing was added to your source files.
- [ ] You resisted adding routing tables / examples / salience tiers. (We tested them. They don't help.)

## Keeping the genome fresh

A genome entry references a file by path, so it can drift when files are renamed or moved. The answer is
tooling, not discipline:

1. **Wire `aigx-lint` into CI** (one step in your workflow). It validates every `<file path>` exists on
   disk and every `<check>` id resolves to a real rule. A renamed file fails the build until the entry is
   updated - exactly how `CODEOWNERS` is kept honest.
2. **Run it as a pre-commit hook** so you catch it locally:
   ```bash
   # .git/hooks/pre-commit  (chmod +x it)
   python tools/aigx-lint/aigx_lint.py --root .
   ```
3. **Update rule ids carefully.** Rule ids (`ARCH-2`, `ENG-7`, …) are the cross-reference backbone. Treat
   a rename the same as a function rename: search-and-replace across all `.aigx` files before committing.

The maintenance overhead is small for a small/mid project; for a monorepo, use hierarchical genomes so
each package's `files.aigx` is short and stable independently of sibling packages.

## Anti-patterns (measured to be bad)

| Tempting idea | Why it loses |
|---|---|
| Put a guard comment in every trap file | In-source injection hurt the strong model; clutters diffs (L1, L3) |
| Add a `<forbid>` to lots of files "to be safe" | Dilutes scarcity; compliance *drops* |
| Make gotchas longer/more complete | Longer glosses measurably *hurt* (L1) |
| Grade salience (CRIT/HIGH/LOW) | Uniform `CRIT` won; grading reduced compliance |
| Add a routing map / worked example to the protocol | Tied at best; usually noise |
| Restate critical rules at top & bottom | Position is a weak lever for selective readers (L2) |
| Duplicate a rule in multiple concern files | One authoritative id per rule; duplication causes parity failures when one copy drifts |
| Write essays in `<rule>` text | One sentence per rule - the benchmark showed prose explanations reduce compliance (L1) |
| Index every file in the repo | Only index files an agent realistically edits; over-indexing bloats context with entries that are never needed |

**When in doubt, do less.** The winning genome is the simple one.
