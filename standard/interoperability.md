# AIGX Interoperability Considerations

Companion to [`AIGX-1.1.md`](AIGX-1.1.md) §17. Normative where RFC 2119 keywords appear.

AIGX is designed to **layer on top of** the formats teams already use, not to replace them. This document
describes how a genome coexists and exchanges with other context formats and across tool/version boundaries.

---

## 1. Media type and discovery

AIGX resources use the media type `application/aigx` with implicit UTF-8 (AIGX-1.1.md §3–§4;
[`media-type-registration.md`](media-type-registration.md)).

- Discovery is by **location and extension**, not by content sniffing: the directory named `.aigx/` and the
  `.aigx` extension identify genome files. There is no magic number (security §4).
- The subtype is `application/aigx`, deliberately **not** `application/aigx+xml`. The `+xml` suffix
  ([RFC 7303](https://www.rfc-editor.org/rfc/rfc7303)) asserts XML well-formedness; AIGX requires only that
  producers SHOULD emit well-formed markup and that readers tolerate minor ill-formedness (spec §8.1). A
  consumer MUST NOT assume a genome file passes a strict XML parser.

---

## 2. Semantic parity (the exchange contract)

The "Exchange" in AI Genome Exchange is this guarantee: any transformation of a genome MUST be
**semantics-preserving** (spec §17.2). A transformation MUST preserve:

- the complete set of rule ids and their full text,
- every `<file>` entry's `path`, `forbid`, `gotcha`, and `check` ids,
- every domain-card `<fact>` and its rule-id tag.

A transformation MAY change representation, ordering, or formatting. It MUST NOT add, remove, or alter the
meaning of any rule, boundary, or fact. This is what makes exporters trustworthy: a projection to another
format carries the same constraints, so an agent reading the export behaves as it would reading the genome.

A tool that re-renders a genome SHOULD be checkable for parity: the rule-id set and the set of
`(path, check-ids)` pairs before and after a transformation MUST be equal.

---

## 3. Coexistence with other context formats

A genome is the substrate; other formats are projections or hosts.

| Other format | Relationship | Bridge |
|---|---|---|
| `AGENTS.md` / `CLAUDE.md` | Host for the agent addendum; OPTIONAL export target | spec §12.3; [`/integrations`](../integrations/) |
| `.cursor/rules/*.mdc` | Host for the addendum (Cursor) | [`integrations/cursor`](../integrations/cursor/) |
| `.windsurfrules` | Host for the addendum (Windsurf) | [`integrations/windsurf`](../integrations/windsurf/) |
| `.github/copilot-instructions.md` | Host for the addendum (Copilot) | [`integrations/copilot`](../integrations/copilot/) |
| `llms.txt` | Different scope (docs index, not code rules) | complementary; no conflict |

A producer SHOULD make the genome authoritative and treat the host file as a pointer to it (the agent
addendum), so that rules live in exactly one place (the genome) and are not duplicated into prose where
they can drift.

---

## 4. Exporters and projections

An exporter that renders a genome to `AGENTS.md`/`CLAUDE.md`/`.mdc` MUST be a parity-preserving projection
(§2). Such an exporter:

- MUST carry every rule's full text and id into the output;
- MUST carry every file entry's path and check ids into the output;
- MAY reorder or reformat for the target's idioms;
- SHOULD note, in the output, that it is generated from `.aigx/` and SHOULD NOT be hand-edited.

Exporters are on the project roadmap; the parity contract here defines what they MUST satisfy when shipped.

---

## 5. Version interoperability

Genomes and tools both carry a `MAJOR.MINOR` version (spec §18).

- A consumer encountering a `version` **newer in MINOR** than it supports MUST NOT fail solely for that
  reason; it SHOULD process the parts it understands (forward compatibility within a major version).
- A consumer encountering a **newer MAJOR** version MAY decline to process the genome and SHOULD report the
  version mismatch rather than misinterpreting incompatible structure.
- A producer targeting v1.1 MUST NOT depend on features introduced in a later minor version, and SHOULD set
  `version="1.1"` on `protocol.aigx` so consumers can negotiate.

Because v1.1 is backward-compatible with v1.0 (a single root `.aigx/` is the one-package case of
hierarchical genomes), a v1.0 consumer reads a v1.1 single-root genome unchanged.

---

## 6. Cross-platform considerations

- **Line endings.** Producers SHOULD emit LF; consumers and validators MUST accept LF and CRLF (spec §4).
- **Path separators.** File-entry `path` values use forward slashes `/`. A tool on Windows MUST normalize
  `\` to `/` when comparing a `path` to an on-disk file. The reference validators do this.
- **Case sensitivity.** Rule ids and paths are case-sensitive. A genome authored on a case-insensitive file
  system SHOULD still use exact-case paths so it validates on case-sensitive systems (Linux CI).

---

## 7. Programmatic interchange

For tools that exchange genome data in JSON (IDE extensions, MCP servers, CI), the canonical JSON data model
is [`AIGX-1.1.schema.json`](AIGX-1.1.schema.json). Producing/consuming that JSON is the RECOMMENDED
interchange path between a parser and a downstream tool, so each tool need not re-implement the surface
grammar. The reference tools emit this shape via `--format json`.

---

## 8. Summary of normative requirements

| # | Requirement |
|---|---|
| I1 | Transformations MUST preserve rule ids, rule text, and file-entry boundaries (§2). |
| I2 | Consumers MUST NOT assume strict XML well-formedness (§1). |
| I3 | Consumers MUST NOT fail solely on a newer MINOR version (§5). |
| I4 | Tools MUST normalize `\` to `/` when matching paths (§6). |
| I5 | Exporters MUST be parity-preserving projections (§4). |
