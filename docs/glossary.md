# Glossary

Key terms used in the AIGX specification, documentation, and benchmark. Terms are listed alphabetically.

---

**Agent addendum**
The one-line instruction added to an agent's existing config (`AGENTS.md`, `CLAUDE.md`, system prompt, etc.)
that makes it AIGX-aware. Defined in [SPEC.md §4](../SPEC.md#4-the-agent-addendum-agent-addendum).

**Boundary index** (see *per-file boundary index*)

**Check ids**
The space-separated rule identifiers in a `<check>` element. An agent MUST verify each referenced rule
holds before declaring a task done. Example: `<check>ARCH-2 DATA-1 TEST-1</check>`.

**Concern file**
A `.aigx/<concern>.aigx` file holding all rules for one domain or area (architecture, data, auth, …).
Each rule is a `<rule id="…">` element. Required: at least one concern file per genome.

**Conforming genome**
A `.aigx/` directory that satisfies [SPEC.md §6](../SPEC.md#6-conformance): a `protocol.aigx`, at least
one concern file with `<rule id>` rules, and a `files.aigx` with at least one resolvable `<check>`.

**Domain card**
An optional `<key>.aigx` file colocated with a source folder (e.g. `src/features/suppliers/suppliers.aigx`).
Gives per-feature context: purpose, public API, test policy, blast radius, tagged facts.

**Expression locality**
The benchmark-backed principle that a rule must be *addressable per edit-target* (retrievable for the
specific file an agent is editing), but need not be physically inside the source file. The per-file index
is the expression map. Contrast with physical colocation (inline source comments), which the benchmark
showed hurts on strong models. See [principles L2](principles.md#l2---per-file-addressability-beats-both-global-prose-and-in-source-inlining).

**files.aigx**
The per-file boundary index. A flat list of `<file>` entries, one per source file an agent is likely to
edit. The keystone of the AIGX format - the single biggest lever found in the benchmark. See
[SPEC.md §3.4](../SPEC.md#34-the-per-file-boundary-index---filesaigx-required---the-keystone).

**Forbid**
A `<forbid>` element in a `<file>` entry. Marks a hard NEVER-do boundary (typically a forbidden import).
SHOULD be rare - only files with a real boundary carry one. Scarcity is the point: if everything is
forbidden, nothing is.

**Genome**
The complete `.aigx/` directory plus optional per-domain cards. By analogy: the central, portable
instruction set that builds and operates a codebase, consulted by AI agents without polluting source code.

**Gotcha**
A `<gotcha>` element in a `<file>` entry. The single most important pitfall for that file. SHOULD be one
per entry - not a list.

**Hierarchical genome**
A genome split across multiple `.aigx/` directories - one per package, workspace, or major subtree in a
monorepo. Each `files.aigx` indexes only its subtree. Defined in [SPEC.md §8](../SPEC.md#8-scaling-to-large-repositories--monorepos).

**Pass@1**
In the benchmark: the fraction of single-attempt runs that passed all tests. Measures reliability on the
first try, not just average performance.

**Per-file boundary index** (see *files.aigx*)

**Priority (`pri`) attribute**
An optional attribute on `<forbid>` and `<gotcha>`. The validated design uses a single uniform level
(`CRIT`); graded scales were tested and did not improve compliance.

**Protocol**
`protocol.aigx` - the read protocol. The first thing an agent reads. Instructs the agent to consult
`files.aigx` for each file it edits and to verify `<check>` ids before finishing.

**Rule**
A `<rule id="PREFIX-N">` element in a concern file. The authoritative, complete statement of one
constraint. Ids are stable - renaming is a breaking change.

**Rule id**
A stable identifier of the form `PREFIX-N` (e.g. `ARCH-2`, `ENG-7`). The cross-reference backbone
used by `<check>` lists, `<fact>` tags, and gotchas. See [SPEC.md §2](../SPEC.md#2-rule-identifiers).

**Scarcity principle**
`<forbid>` SHOULD appear on only the few files that truly have an import boundary. Adding forbids
broadly dilutes the signal and measurably reduces compliance. One of the key benchmark findings.

**Semantic parity**
The requirement that any transformation of a genome (re-rendering, exporting) preserves the complete
rule-id set, all file entry fields, and all facts. Defined in [SPEC.md §5](../SPEC.md#5-semantic-parity-for-tools-that-transform-genomes).

**Sharded genome** (see *hierarchical genome*)
