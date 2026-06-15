# AIGX Specification - v1.1

**Status:** Stable · **Version:** 1.1 · **License:** MIT · **Last updated:** 2026-06-15

> **v1.1 adds [§8 Scaling](#8-scaling-to-large-repositories--monorepos)** - hierarchical (sharded)
> genomes and per-file resolution - so the format bounds context cost on large repositories and monorepos.
> v1.1 is backwards-compatible with v1.0 (a single root `.aigx/` is the one-package case).

AIGX (AI Genome Exchange) is a context format for AI coding agents. This document is the **normative**
definition. The key words MUST, SHOULD, and MAY are used per [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

> **Design north star:** an AI agent reads selectively at the edit site. The format MUST make the binding
> constraint for the file being edited reachable in one lookup, while keeping the source code untouched.

---

## 1. Directory layout

An AIGX genome is a directory named `.aigx/` at the repository root, plus optional per-domain cards
colocated with source folders.

```text
<repo-root>/
├── .aigx/
│   ├── protocol.aigx        # REQUIRED - the read protocol
│   ├── product.aigx         # RECOMMENDED - product context + doc freshness
│   ├── files.aigx           # REQUIRED - the per-file boundary index
│   └── <concern>.aigx       # REQUIRED (≥1) - per-concern rule files
└── <any source dir>/
    └── <key>.aigx           # OPTIONAL - a per-domain card
```

- Files use the `.aigx` extension and UTF-8 encoding.
- The syntax is **XML-style tags** (chosen for parseability), but a genome is read by an LLM, not a
  strict XML parser; well-formedness SHOULD hold but is not required to be schema-validated.
- Source code files MUST NOT be modified. AIGX is centralized; nothing is injected into source.

---

## 2. Rule identifiers

Every rule has a stable identifier of the form `PREFIX-N` (e.g. `ARCH-2`, `DATA-1`, `ENG-10`).

- The `PREFIX` SHOULD name the concern (`ARCH`, `DATA`, `AUTH`, `CACHE`, `PERF`, `TEST`, `AI`, `OFF`,
  `ENG`, …). The prefix is conventionally the uppercased concern name.
- Ids MUST be stable across edits - they are the cross-reference backbone used by `<check>` lists,
  `<fact>`s, and gotchas. Renaming a rule id is a breaking change to the genome.
- Ids are the unit of *parity*: any tool that re-renders a genome MUST preserve the full rule-id set.

---

## 3. The files (normative grammar)

### 3.1 `protocol.aigx` (REQUIRED)

The read protocol. It is the first thing an agent reads. It MUST instruct the agent to consult
`files.aigx` for each file it edits and to verify the file's `<check>` ids before finishing.

```xml
<aigx-protocol version="1.1">
  <read-first>Open .aigx/files.aigx and find the <file> entry for EACH file you will edit … obey its
   <forbid pri="CRIT"> and satisfy every id in its <check> before finishing.</read-first>
  <step n="1">Read the per-concern rule files in .aigx/ that the task touches.</step>
  <step n="2">Read .aigx/files.aigx for the per-file boundaries of files you edit.</step>
  <step n="3">Schema-first; failing test first; minimal change, local blast radius.</step>
  <step n="4">Run gates; verify each file's <check> ids hold.</step>
</aigx-protocol>
```

It SHOULD be short (one screen). Per the [principles](docs/principles.md), lengthening or adding
scaffolding to the protocol did not improve outcomes and sometimes hurt.

### 3.2 `product.aigx` (RECOMMENDED)

Top-level product context. SHOULD include a `<freshness>` element that explicitly states which older
documents are superseded - this resolves stale-doc conflicts an agent would otherwise inherit.

```xml
<aigx-product name="…">
  <name>…</name>
  <standard>…what 'good' means for this product…</standard>
  <freshness>…which dated docs are historical and yield to this genome…</freshness>
  <stack>…the tech stack…</stack>
</aigx-product>
```

### 3.3 Per-concern rule files - `<concern>.aigx` (REQUIRED, ≥1)

Each concern file is a flat list of `<rule>` elements carrying the **full** rule text:

```xml
<aigx-architecture>
  <rule id="ARCH-2">Every feature exposes ONE public API: its index.ts barrel. Deep imports are forbidden.</rule>
  <rule id="ARCH-6">TypeScript strict mode; the `any` type is forbidden in any form.</rule>
</aigx-architecture>
```

- Element name SHOULD be `aigx-<concern>`; child elements MUST be `<rule id="…">`.
- Rule text MUST be the authoritative, complete statement of the rule. Glosses/abbreviations belong (if
  anywhere) in the index, never here.

### 3.4 The per-file boundary index - `files.aigx` (REQUIRED) - the keystone

A flat list of `<file>` entries, one per source file an agent is likely to edit.

```xml
<aigx-files>
  <file path="src/features/meetings/bookMeeting.ts" domain="meetings">
    <role>Book a meeting (validate slot + contact)</role>
    <forbid pri="CRIT">NEVER import @/features/suppliers/internal/* (deep import = ARCH-2)</forbid>
    <gotcha pri="CRIT">get contact_email from the suppliers PUBLIC api, never the internal mapper</gotcha>
    <check>ARCH-2 ARCH-4 ARCH-5 DATA-2 TEST-1</check>
  </file>
</aigx-files>
```

**Per-entry fields:**

| Element | Card. | Meaning |
|---|---|---|
| `path` (attr) | 1 | Repo-relative path of the file. REQUIRED. |
| `domain` (attr) | 0-1 | The domain/feature key this file belongs to. |
| `<role>` | 0-1 | One line: what this file is for. |
| `<forbid>` | 0-1 | A hard NEVER-do boundary (typically a forbidden import). **SHOULD be rare** - only files with a real boundary carry one. |
| `<gotcha>` | 0-1 | The single most important pitfall for this file. |
| `<check>` | 0-1 | Space-separated rule-ids the agent MUST verify before finishing. |

**Normative authoring constraints (these are what the benchmark validated):**

- **Scarcity.** `<forbid>` SHOULD appear on only the few files that truly have an import boundary. Marking
  many files dilutes the signal and measurably reduces compliance.
- **One gotcha.** Each entry SHOULD carry at most one `<gotcha>` - the single worst pitfall - not a list.
- **Terse fields only.** The index SHOULD carry only `role` + `forbid` + `gotcha` + `check`. Richer
  per-file fields (allow/schema/data/perf) were tested and did not improve outcomes.

### 3.5 Salience - the `pri` attribute

`<forbid>` and `<gotcha>` MAY carry `pri="CRIT"`. In the validated design, **all** critical boundaries
use a single uniform level (`CRIT`). Graded scales (CRIT/WARN, CRIT/HIGH/NORM) were tested and did not
help. Tools MUST treat an absent `pri` as normal priority.

### 3.6 Per-domain cards - `<key>.aigx` (OPTIONAL)

Colocated with a source folder, named after the domain key. Gives feature-level context.

```xml
<aigx-domain key="suppliers" path="src/features/suppliers">
  <purpose>…</purpose>
  <public_api>…the barrel / entry point…</public_api>
  <test>…the test policy for this domain…</test>
  <blast>…the blast radius…</blast>
  <facts>
    <fact>…a fact, tagged with the rule id it enforces (ARCH-3).</fact>
  </facts>
</aigx-domain>
```

---

## 4. The agent addendum {#agent-addendum}

To make any agent AIGX-aware, append this to its instructions (system prompt, `AGENTS.md`, `CLAUDE.md`,
Cursor rule, etc.). It is the only integration step required.

> This repository uses AIGX - the AI Genome Exchange context format. The `.aigx/` directory holds the
> context: read `.aigx/protocol.aigx` first; then the per-concern rule files (`.aigx/<concern>.aigx`,
> each a set of `<rule id="…">` tags) your task touches. `.aigx/files.aigx` is the PER-FILE BOUNDARY
> INDEX: for EACH file you edit, find its `<file path="…">` entry - obey its `<forbid pri="CRIT">`
> (NEVER-imports), heed its `<gotcha>`, and verify every id in its `<check>` before finishing. Each domain
> folder may have a `<domain>.aigx` card. Keep blast radius local unless justified.

---

## 5. Semantic parity (for tools that transform genomes)

A core property AIGX inherits from its benchmark: any transformation of a genome (re-rendering,
exporting, compressing) MUST be **semantics-preserving**. Specifically it MUST preserve:

- the complete set of rule ids and their full text,
- every `<file>` entry's `path`, `forbid`, `gotcha`, and `check` ids,
- every `<fact>` and domain card's content.

A transformation MAY change representation, ordering, or formatting; it MUST NOT add, remove, or alter the
meaning of any rule, boundary, or fact. (Exporters to `AGENTS.md`/`CLAUDE.md`/`.mdc` are
parity-preserving projections.)

---

## 6. Conformance

A directory is a **conforming AIGX v1.0 genome** if it has, at minimum:

1. a `.aigx/protocol.aigx` instructing per-file index lookup and `<check>` verification,
2. at least one `.aigx/<concern>.aigx` with `<rule id="…">` rules, and
3. a `.aigx/files.aigx` with at least one `<file path="…">` entry whose `<check>` ids resolve to rules
   that exist in the concern files.

A conforming **AIGX reader** (agent or tool) MUST, for each file it edits, consult that file's `files.aigx`
entry and honor its `<forbid>` and `<check>`.

---

## 7. Comments and annotations

AIGX files MAY contain XML comments (`<!-- … -->`) for human authoring notes. Conforming readers MUST
ignore XML comments and MUST NOT treat them as rules, boundaries, or structured content. Comments are
useful for annotating why a rule exists or flagging a `<forbid>` for review; they have no semantic effect.

---

## 8. Scaling to large repositories & monorepos

A single root `files.aigx` is correct for a small/mid project, but a flat index does not scale to a 50,000
-file monorepo. AIGX v1.1 bounds context cost with two mechanisms.

### 8.1 Hierarchical (sharded) genomes

A repository MAY contain **multiple `.aigx/` directories** - one per package, workspace, or major subtree:

```text
monorepo/
├── .aigx/                      # OPTIONAL root genome: only org-wide rules + the few cross-cutting files
│   ├── protocol.aigx
│   └── architecture.aigx       # rules that apply everywhere
├── packages/
│   ├── checkout/
│   │   └── .aigx/
│   │       ├── files.aigx      # indexes ONLY packages/checkout/**
│   │       └── data.aigx       # rules local to checkout
│   └── search/
│       └── .aigx/
│           └── files.aigx      # indexes ONLY packages/search/**
```

**Resolution rules (normative):**

- A `files.aigx` entry's `path` is resolved **relative to the repository root** (so paths are unambiguous
  across shards).
- A genome at `<dir>/.aigx/` SHOULD index only files under `<dir>/`. It MUST NOT be required to list files
  outside its subtree.
- For a file being edited, the **applicable genome** is the nearest ancestor `.aigx/` directory; the root
  `.aigx/` (if present) provides org-wide rules that apply in addition.
- An agent editing within one package SHOULD load only that package's genome (plus the small root genome),
  **not** sibling packages' genomes. Context is therefore bounded by the **working package**, not the repo.

This makes the design *more* consistent with the locality principle ([principles L2](docs/principles.md)):
context is addressed to the subtree the agent is actually in.

### 8.2 Per-file resolution (constant-cost lookup)

The boundary index is meant to be **looked up, not ingested**. A conforming tool SHOULD be able to return
the single `<file>` entry for a given path, so an agent's context cost is **O(1) per edited file,
independent of index size.** The bundled reference linter implements this:

```bash
aigx-lint --resolve src/features/meetings/bookMeeting.ts
# prints exactly that file's <file> entry - nothing else
```

A 50,000-entry index thus costs an agent one resolution call (or one grep), not 50,000 lines. Editor and
MCP integrations SHOULD expose this resolution so the agent never loads a whole index.

### 8.3 Freshness at scale

Because entries reference paths, a genome can drift as files move. A conforming repository SHOULD run a
validator (e.g. the bundled `aigx-lint`) in CI so that a moved/renamed file **fails the build** until its
entry is corrected - the same discipline used for `CODEOWNERS`, `tsconfig` path maps, and ESLint
import-boundary rules. See [docs/limitations.md §2](docs/limitations.md#2-developer-experience--decoupled-docs-rot-the-moment-a-file-moves).

> **Status:** hierarchical genomes and resolution are specified and tool-supported. They are **not yet
> benchmarked at monorepo scale** - that's labeled future work, not a measured claim.

## 9. Versioning

This spec is **v1.1**. Backwards-incompatible changes increment the major version; backwards-compatible
additions increment the minor. Genomes MAY declare their target version via an optional `version="1.1"`
attribute on the root of `protocol.aigx`.

See [`examples/sourcing-app/`](examples/sourcing-app/) for a complete conforming genome,
[`BENCHMARK.md`](BENCHMARK.md) for the evidence behind every "SHOULD", and
[`docs/limitations.md`](docs/limitations.md) for the scope and honest caveats.
