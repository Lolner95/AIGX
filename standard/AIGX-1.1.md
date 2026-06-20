# AIGX — AI Genome Exchange
## Normative Specification, Version 1.1

| | |
|---|---|
| **Format name** | AIGX |
| **Long name** | AI Genome Exchange |
| **Version** | 1.1 |
| **Status** | Stable |
| **File extension** | `.aigx` |
| **Directory convention** | `.aigx/` |
| **Media type** | `application/aigx` |
| **Encoding** | UTF-8 |
| **Specification license** | CC-BY-4.0 |
| **Reference-tool license** | MIT |
| **Change controller** | Grégory Parisotto (gregory@feex.it) |
| **Published at** | https://github.com/Lolner95/AIGX |

This document is the normative definition of AIGX version 1.1. It supersedes the informal
[`SPEC.md`](../SPEC.md) for conformance purposes; where the two differ, this document governs.

---

## 1. Introduction

AIGX (AI Genome Exchange) is a text-based context format for AI coding agents. It stores a codebase's
architectural rules, per-file boundaries, and conventions in a centralized `.aigx/` directory and injects
nothing into source code. An AIGX *genome* lets any AI agent inherit how a project works by reading a
small, addressable set of files instead of a wall of prose.

The design north star is empirical: an AI agent reads selectively at the edit site. The format MUST make
the binding constraint for the file being edited reachable in **one lookup**, while keeping source code
untouched. Every normative SHOULD in this document traces to a controlled benchmark result documented in
[`BENCHMARK.md`](../BENCHMARK.md).

This specification defines:

- the directory layout and file set of a genome (§5–§7),
- the surface grammar of genome files (§8) and the formal grammar in [`AIGX-1.1.abnf`](AIGX-1.1.abnf),
- the canonical JSON data model in [`AIGX-1.1.schema.json`](AIGX-1.1.schema.json),
- rule identifiers (§9), the per-file boundary index (§10), and domain cards (§11),
- the agent read protocol (§12),
- conformance requirements for writers, readers, and validators (§13–§15),
- security (§16), interoperability (§17), versioning (§18), and change control (§19).

This specification does **not** define a runtime, an agent, or a wire protocol for transmitting genomes
between processes. A genome is a set of files on disk.

---

## 2. Terminology

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**,
**RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

| Term | Definition |
|---|---|
| **Genome** | A `.aigx/` directory and its files, optionally with colocated domain cards. The complete AIGX context for a repository or subtree. |
| **Concern file** | A file `<concern>.aigx` containing a flat list of `<rule>` elements for one concern (architecture, data, auth, …). |
| **Rule** | A single `<rule id="…">` element carrying a stable identifier and the full rule text. |
| **Rule identifier (id)** | The stable, citable name of a rule, of the form `PREFIX-SLUG` (§9). |
| **Boundary index** | The file `files.aigx` — a flat list of `<file>` entries, one per source file an agent is likely to edit. The keystone of the format. |
| **File entry** | A `<file path="…">` element in the boundary index, carrying a file's role, forbids, gotcha, and check ids. |
| **Check** | A rule id listed in a file entry's `<check>` element that an agent MUST verify before finishing an edit to that file. |
| **Domain card** | An OPTIONAL `<key>.aigx` file colocated with a source folder, giving feature-level context. |
| **Producer / writer** | Any tool or human that creates or modifies genome files. |
| **Consumer / reader** | Any agent or tool that reads a genome to act on it (the principal case being an AI coding agent). |
| **Validator** | A tool that checks a genome against the conformance requirements of this document and against the repository on disk. |
| **Applicable genome** | For a given file, the genome that governs it: the nearest ancestor `.aigx/` directory, plus the root `.aigx/` if present (§5.2). |
| **Semantic parity** | The property that a transformation of a genome preserves the complete set of rule ids, rule text, and file-entry boundaries (§17.2). |

---

## 3. File extension

Genome files MUST use the extension `.aigx`. The extension is the same for every kind of genome file
(`protocol.aigx`, `files.aigx`, `architecture.aigx`, domain cards, …); the **file name stem** carries the
role, not a distinct extension.

A file with the `.aigx` extension SHOULD be served and stored with the media type `application/aigx`
(§17.1, and the registration in [`media-type-registration.md`](media-type-registration.md)).

---

## 4. Encoding

Genome files MUST be encoded in UTF-8. A producer MUST NOT emit a UTF-8 byte-order mark (BOM); a consumer
SHOULD tolerate and ignore a leading BOM if present. Line endings MAY be LF or CRLF; producers SHOULD emit
LF. There is no other character-set parameter; `application/aigx` always implies UTF-8.

---

## 5. Directory layout

### 5.1 The `.aigx/` directory

A genome is a directory named exactly `.aigx` located at a repository root or at the root of a package or
subtree within the repository.

```text
<repo-root>/
├── .aigx/
│   ├── protocol.aigx        # REQUIRED — the read protocol
│   ├── product.aigx         # RECOMMENDED — product context + doc freshness
│   ├── files.aigx           # REQUIRED — the per-file boundary index
│   └── <concern>.aigx       # REQUIRED (≥1) — per-concern rule files
└── <any source dir>/
    └── <key>.aigx           # OPTIONAL — a per-domain card
```

Source code files MUST NOT be modified by the act of adopting AIGX. AIGX is centralized; nothing is
injected into source.

### 5.2 Hierarchical (sharded) genomes

A repository MAY contain multiple `.aigx/` directories — one per package, workspace, or major subtree —
to bound context cost on large repositories and monorepos. The following rules are normative:

- A file entry's `path` (§10) MUST be resolved **relative to the repository root**, so paths are
  unambiguous across shards.
- A genome at `<dir>/.aigx/` SHOULD index only files under `<dir>/`. It MUST NOT be required to list files
  outside its subtree.
- For a file being edited, the **applicable genome** is the nearest ancestor `.aigx/` directory. If a root
  `.aigx/` is also present, it provides org-wide rules that apply in addition.
- A consumer editing within one package SHOULD load only that package's genome plus the root genome, and
  SHOULD NOT load sibling packages' genomes.

---

## 6. Required files

A conforming genome MUST contain:

1. **`protocol.aigx`** — the read protocol (§12). REQUIRED.
2. **At least one `<concern>.aigx`** — a per-concern rule file with at least one `<rule id="…">` (§9). REQUIRED.
3. **`files.aigx`** — the per-file boundary index with at least one `<file path="…">` entry whose `<check>`
   ids resolve to rules that exist in the concern files (§10). REQUIRED.

A genome that omits any of these is non-conforming (§13–§15).

---

## 7. Optional files

A conforming genome MAY additionally contain:

1. **`product.aigx`** — top-level product context, RECOMMENDED, including a `<freshness>` element (§12.2).
2. **Domain cards** — `<key>.aigx` files colocated with source folders (§11).
3. **Additional concern files** — any number of `<concern>.aigx` beyond the required minimum.
4. **XML comments** — `<!-- … -->` anywhere, for human authoring notes (§8.4).

Consumers MUST NOT require any optional file to be present.

---

## 8. Grammar

### 8.1 Surface syntax

AIGX uses **XML-style tags**: elements delimited by `<name>` … `</name>`, with double-quoted attributes.
The choice of XML-style syntax is for human and machine parseability; a genome is read by an LLM, not
necessarily by a strict XML parser.

A conforming producer SHOULD emit well-formed markup as defined by the ABNF in
[`AIGX-1.1.abnf`](AIGX-1.1.abnf). A conforming consumer MUST tolerate minor ill-formedness (for example, an
unescaped `&` in rule prose) and SHOULD recover by treating the affected run as text. Schema validation of
genome files is OPTIONAL and is NOT required for conformance — the normative structural requirements are
those stated in this document, not those of any XML schema language.

### 8.2 Elements defined by this specification

| Root element | File | Defined in |
|---|---|---|
| `<aigx-protocol>` | `protocol.aigx` | §12.1 |
| `<aigx-product>` | `product.aigx` | §12.2 |
| `<aigx-<concern>>` | `<concern>.aigx` | §9 |
| `<aigx-files>` | `files.aigx` | §10 |
| `<aigx-domain>` | `<key>.aigx` | §11 |

A producer MUST NOT use a root element name beginning with `aigx-` for any purpose other than those defined
above or by a future version of this specification.

### 8.3 Character escaping

Within element text, the characters `<` and `&` SHOULD be escaped as `&lt;` and `&amp;` respectively when
they would otherwise be ambiguous. Producers MAY leave `&` unescaped in prose; consumers MUST NOT reject a
genome solely for an unescaped `&`. Attribute values MUST be double-quoted and MUST escape a literal `"` as
`&quot;`.

### 8.4 Comments

Genome files MAY contain XML comments (`<!-- … -->`). A conforming consumer MUST ignore comments and MUST
NOT treat their contents as rules, boundaries, or any structured content. A conforming validator MUST strip
comments before evaluating structure, so that commented-out rules and entries do not count.

---

## 9. Rule identifiers

Every rule has a stable identifier of the form `PREFIX-SLUG`.

```
PREFIX-SLUG
│      │
│      └── SLUG: a sequential number (2) OR a semantic kebab-case phrase (no-deep-imports)
└── PREFIX: the uppercased concern name (ARCH, DATA, AUTH, ENG, …)
```

- The `PREFIX` SHOULD name the concern and SHOULD be the uppercased concern name used in the concern file's
  root element (a rule in `<aigx-architecture>` SHOULD use prefix `ARCH`).
- The `SLUG` MUST consist solely of ASCII letters, digits, and hyphens, matching the regular expression
  `[A-Za-z0-9-]+`. A purely numeric slug and a semantic kebab-case slug are both valid.
- **Semantic slugs are RECOMMENDED** for new genomes (`ARCH-no-deep-imports` over `ARCH-2`), because a
  reviewer reading a `<check>` list understands the rule without opening a second file.
- A rule id MUST be **stable** across edits. Renaming or deleting a rule id is a **breaking change** to the
  genome (§18). If a rule's meaning changes, the producer MUST update the rule text in place and keep the id.
- A rule id MUST be **unique** within a genome. Two `<rule>` elements with the same id are a conformance
  error (§15).

A concern file is the root element `<aigx-<concern>>` containing a flat list of `<rule id="…">` children.
The rule text MUST be the authoritative, complete statement of the rule; abbreviated glosses belong (if
anywhere) in the boundary index, never in the rule itself.

```xml
<aigx-architecture>
  <rule id="ARCH-no-deep-imports">Every feature exposes ONE public API: its index barrel. Deep imports are forbidden.</rule>
  <rule id="ARCH-ts-strict">TypeScript strict mode; the `any` type is forbidden in any form.</rule>
</aigx-architecture>
```

---

## 10. Per-file boundary index

`files.aigx` is the keystone of the format: a flat list of `<file>` entries, one per source file an agent
is likely to edit.

```xml
<aigx-files>
  <file path="src/features/meetings/bookMeeting.ts" domain="meetings">
    <role>Book a meeting (validate slot + contact)</role>
    <forbid pri="CRIT">NEVER import @/features/suppliers/internal/* (deep import = ARCH-no-deep-imports)</forbid>
    <gotcha pri="CRIT">get contact_email from the suppliers PUBLIC api, never the internal mapper</gotcha>
    <check>ARCH-no-deep-imports DATA-integer-cents TEST-failing-first</check>
  </file>
</aigx-files>
```

### 10.1 Fields

| Element | Card. | Requirement |
|---|---|---|
| `path` (attribute) | 1 | REQUIRED. Repo-root-relative path of the file (§5.2). |
| `domain` (attribute) | 0–1 | OPTIONAL. The domain/feature key this file belongs to. |
| `<role>` | 0–1 | RECOMMENDED. One line: what this file is for. |
| `<forbid>` | 0–1 | OPTIONAL. A hard NEVER-do boundary (typically a forbidden import). |
| `<gotcha>` | 0–1 | OPTIONAL. The single most important pitfall for this file. |
| `<check>` | 0–1 | RECOMMENDED. Space-separated rule ids the agent MUST verify before finishing. |

### 10.2 Normative authoring constraints

These constraints are what the benchmark validated; a conforming producer SHOULD honor them:

- **Scarcity of forbids.** `<forbid>` SHOULD appear on only the few files that truly have an import
  boundary. Marking many files dilutes the signal and measurably reduces compliance.
- **One gotcha.** Each entry SHOULD carry at most one `<gotcha>` — the single worst pitfall — not a list.
- **Terse fields only.** An entry SHOULD carry only `role`, `forbid`, `gotcha`, and `check`. Richer
  per-file fields were tested and did not improve outcomes.

### 10.3 Salience

`<forbid>` and `<gotcha>` MAY carry a `pri` attribute. In the validated design, all critical boundaries use
a single uniform level, `pri="CRIT"`. Graded scales were tested and did not help. A consumer MUST treat an
absent `pri` as normal priority and MUST NOT require any `pri` value.

### 10.4 Resolution

The boundary index is meant to be **looked up, not ingested**. A conforming validator SHOULD be able to
return the single `<file>` entry for a given path in time independent of index size, so that a consumer's
context cost is O(1) per edited file (§15, and the `resolve` command in [`conformance.md`](conformance.md)).

---

## 11. Domain cards

A domain card is an OPTIONAL `<key>.aigx` file colocated with a source folder, giving feature-level context.

```xml
<aigx-domain key="suppliers" path="src/features/suppliers">
  <purpose>…</purpose>
  <public_api>…the barrel / entry point…</public_api>
  <test>…the test policy for this domain…</test>
  <blast>…the blast radius…</blast>
  <facts>
    <fact>…a fact, tagged with the rule id it enforces (ARCH-narrow-public-api).</fact>
  </facts>
</aigx-domain>
```

- The `key` attribute SHOULD match the `domain` attribute used by the file entries (§10) for files in this
  folder.
- A `<fact>` SHOULD reference the rule id it enforces, so facts stay traceable to rules.
- Domain cards carry no requirement that a consumer load them eagerly; they are addressed context, loaded
  when the agent works within that domain.

---

## 12. Agent read protocol

### 12.1 `protocol.aigx`

`protocol.aigx` is REQUIRED and is the first file an agent reads. It MUST instruct the agent to consult
`files.aigx` for each file it edits and to verify that file's `<check>` ids before finishing.

```xml
<aigx-protocol version="1.1">
  <read-first>Open .aigx/files.aigx and find the &lt;file&gt; entry for EACH file you will edit; obey its
   &lt;forbid pri="CRIT"&gt; and satisfy every id in its &lt;check&gt; before finishing.</read-first>
  <step n="1">Read the per-concern rule files in .aigx/ that the task touches.</step>
  <step n="2">Read .aigx/files.aigx for the per-file boundaries of files you edit.</step>
  <step n="3">Schema-first; failing test first; minimal change, local blast radius.</step>
  <step n="4">Run gates; verify each file's &lt;check&gt; ids hold before declaring done.</step>
</aigx-protocol>
```

`protocol.aigx` SHOULD be short (one screen). The root element MAY carry a `version` attribute declaring
the target specification version (§18).

### 12.2 `product.aigx`

`product.aigx` is RECOMMENDED. It SHOULD include a `<freshness>` element that explicitly states which older
documents are superseded by the genome, resolving stale-doc conflicts an agent would otherwise inherit.

### 12.3 The agent addendum

To make any agent AIGX-aware, a producer appends a short addendum to the agent's instructions (system
prompt, `AGENTS.md`, `CLAUDE.md`, a Cursor rule, etc.). This is the only integration step REQUIRED:

> This repository uses AIGX — the AI Genome Exchange context format. Read `.aigx/protocol.aigx` first; then
> the per-concern rule files (`.aigx/<concern>.aigx`) your task touches. `.aigx/files.aigx` is the per-file
> boundary index: for EACH file you edit, find its `<file path="…">` entry — obey its `<forbid pri="CRIT">`,
> heed its `<gotcha>`, and verify every id in its `<check>` before finishing.

Ready-made addenda for common agents are in [`/integrations`](../integrations/).

---

## 13. Conforming writer

A **conforming writer** (producer) MUST:

- W1. Emit files with the `.aigx` extension in UTF-8 without a BOM (§3, §4).
- W2. Produce a genome containing at least the three required files (§6).
- W3. Assign every rule a unique, stable id matching `PREFIX-[A-Za-z0-9-]+` (§9).
- W4. Ensure every `<check>` id in `files.aigx` resolves to a rule that exists in a concern file of the
  applicable genome (§10).
- W5. Resolve every file-entry `path` relative to the repository root (§5.2).
- W6. Preserve rule ids across edits; never reuse a retired id for a different rule (§9, §18).

A conforming writer SHOULD honor the authoring constraints of §10.2 and SHOULD include `product.aigx` with
a `<freshness>` element.

---

## 14. Conforming reader

A **conforming reader** (consumer) MUST:

- R1. Locate the applicable genome for a file as the nearest ancestor `.aigx/`, plus the root `.aigx/` if
  present (§5.2).
- R2. For each file it edits, consult that file's `<file>` entry in `files.aigx` (if one exists) and honor
  its `<forbid>` and verify its `<check>` ids before finishing (§10, §12).
- R3. Ignore XML comments (§8.4).
- R4. Tolerate minor ill-formedness and recover gracefully rather than rejecting the genome (§8.1).
- R5. Treat an absent `pri` attribute as normal priority (§10.3).

A conforming reader SHOULD read `protocol.aigx` before acting, and SHOULD load only the applicable genome
in a hierarchical layout (§5.2).

---

## 15. Conforming validator

A **conforming validator** MUST report as an **error** any of:

- V1. A required file is missing (§6).
- V2. A `<check>` id that does not resolve to any `<rule id>` in the applicable genome (§10).
- V3. A file-entry `path` that does not exist on disk (a moved/renamed/deleted file — "stale entry").
- V4. Two `<rule>` elements sharing the same id within a genome (§9).

A conforming validator SHOULD report as a **warning** any of:

- V5. A duplicate `<file>` entry for the same `path`.
- V6. A `<forbid>` density high enough to dilute salience (§10.2).
- V7. A root element beginning with `aigx-` that is not defined by this specification (§8.2).

A conforming validator MUST exit with a non-zero status when any error is present, so it can gate CI. It
SHOULD provide a per-file resolution mode that returns exactly one `<file>` entry for a given path (§10.4).

The reference validator is [`aigx-lint`](../tools/aigx-lint/) (Python, zero-dependency) and the `aigx lint`
and `aigx resolve` subcommands of the [`aigx` CLI](../packages/aigx/) (Node, zero-dependency).

---

## 16. Security considerations

Genome text enters an AI agent's context and influences code it writes; it is **untrusted input to a
powerful actor**. The full analysis is in [`security-considerations.md`](security-considerations.md). In
summary:

- **Instruction injection.** A genome can instruct an agent to take harmful actions. Consumers SHOULD treat
  a genome from an untrusted repository with the same suspicion as any untrusted instruction source, and
  MUST NOT escalate a genome's authority above the user's own policy.
- **Path handling.** File-entry `path` values are repo-relative; a validator MUST NOT follow a `path` that
  escapes the repository root (e.g. via `..`) and MUST reject or ignore such entries.
- **No execution.** The format defines no executable content; a conforming reader MUST NOT execute genome
  content as code. Tooling MUST treat genome files as data.
- **Supply chain.** Because a genome shapes generated code, a malicious genome is a supply-chain risk.
  Genome changes SHOULD be code-reviewed like any other change.

---

## 17. Interoperability considerations

The full analysis is in [`interoperability.md`](interoperability.md). In summary:

### 17.1 Media type and discovery

AIGX files use the media type `application/aigx` (UTF-8). The directory name `.aigx/` and the `.aigx`
extension are the discovery mechanism; there is no magic number. See
[`media-type-registration.md`](media-type-registration.md).

### 17.2 Semantic parity

Any transformation of a genome (re-rendering, exporting to `AGENTS.md`/`CLAUDE.md`/`.mdc`, compression)
MUST be **semantics-preserving**: it MUST preserve the complete set of rule ids and their full text, every
file entry's `path`/`forbid`/`gotcha`/`check`, and every domain-card fact. A transformation MAY change
representation, ordering, or formatting; it MUST NOT add, remove, or alter the meaning of any rule,
boundary, or fact.

### 17.3 Coexistence

AIGX is designed to layer on top of existing formats, not replace them. A genome coexists with `AGENTS.md`,
`CLAUDE.md`, `.cursor/rules`, `.windsurfrules`, and `llms.txt`; the agent addendum (§12.3) is the bridge.

### 17.4 Version negotiation

A consumer encountering a genome whose declared `version` is newer than it supports SHOULD process the
parts it understands and MUST NOT fail solely because of an unrecognized minor version (§18).

---

## 18. Versioning

This specification is versioned with a `MAJOR.MINOR` number.

- A **MAJOR** increment signals a backward-incompatible change (for example, removing a required file,
  changing the meaning of an existing element, or changing rule-id syntax).
- A **MINOR** increment signals a backward-compatible addition (for example, adding an OPTIONAL element or
  an integration pattern). v1.1 added hierarchical genomes (§5.2) over v1.0 and is backward-compatible: a
  single root `.aigx/` is the one-package case.

A genome MAY declare its target version via a `version` attribute on the root element of `protocol.aigx`.
Within a major version, a producer MUST NOT rely on features from a minor version higher than it declares,
and a consumer SHOULD accept any minor version of the same major version (§17.4).

Renaming or deleting a rule id is a breaking change **to that genome** (not to the spec) and is governed by
§9 and the producer's own change policy.

---

## 19. Change control

This specification is maintained under the change-control policy in
[`change-control.md`](change-control.md). The change controller is Grégory Parisotto. Proposed changes are
submitted as issues or pull requests against the published repository; backward-incompatible changes require
a MAJOR version increment and a migration note. The specification text is licensed CC-BY-4.0; the reference
tools are licensed MIT.

---

## 20. Examples

### 20.1 Minimal conforming genome

The smallest genome that satisfies §6:

```text
.aigx/
├── protocol.aigx
├── architecture.aigx
└── files.aigx
```

`protocol.aigx`:

```xml
<aigx-protocol version="1.1">
  <read-first>For EACH file you edit, find its &lt;file&gt; entry in .aigx/files.aigx; obey its
   &lt;forbid&gt; and verify every id in its &lt;check&gt; before finishing.</read-first>
  <step n="1">Read the concern files your task touches.</step>
  <step n="2">Read .aigx/files.aigx for each file you edit.</step>
  <step n="3">Minimal change; verify &lt;check&gt; ids before done.</step>
</aigx-protocol>
```

`architecture.aigx`:

```xml
<aigx-architecture>
  <rule id="ARCH-no-deep-imports">Each module exposes one public entry point; internal sub-paths are forbidden to import directly.</rule>
</aigx-architecture>
```

`files.aigx`:

```xml
<aigx-files>
  <file path="src/core/service.ts" domain="core">
    <role>Main application service — the entry point for all business logic</role>
    <forbid pri="CRIT">NEVER import from src/core/internal/* directly (ARCH-no-deep-imports)</forbid>
    <check>ARCH-no-deep-imports</check>
  </file>
</aigx-files>
```

This genome conforms: it has `protocol.aigx` (§6.1), one concern file with a rule (§6.2), and a `files.aigx`
whose single `<check>` id (`ARCH-no-deep-imports`) resolves to a rule that exists (§6.3). See
[`examples/minimal/`](../examples/minimal/).

### 20.2 Complete worked example

A complete, real-world genome — multiple concern files, a populated boundary index, and domain cards — is
in [`examples/sourcing-app/`](../examples/sourcing-app/).

---

## Appendix A. Reference artifacts

| Artifact | File |
|---|---|
| Formal grammar (ABNF) | [`AIGX-1.1.abnf`](AIGX-1.1.abnf) |
| Canonical JSON data model | [`AIGX-1.1.schema.json`](AIGX-1.1.schema.json) |
| Media type registration | [`media-type-registration.md`](media-type-registration.md) |
| Security considerations | [`security-considerations.md`](security-considerations.md) |
| Conformance suite | [`conformance.md`](conformance.md) |
| Interoperability | [`interoperability.md`](interoperability.md) |
| Change control | [`change-control.md`](change-control.md) |
| Reference validator | [`tools/aigx-lint/`](../tools/aigx-lint/) · [`packages/aigx/`](../packages/aigx/) |

## Appendix B. Conformance requirement index

| ID | Requirement | Section |
|---|---|---|
| W1–W6 | Conforming writer | §13 |
| R1–R5 | Conforming reader | §14 |
| V1–V7 | Conforming validator | §15 |
