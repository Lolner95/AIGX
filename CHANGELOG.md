# Changelog

All notable changes to the AIGX specification and repository are documented here. This project adheres to
[Semantic Versioning](https://semver.org) for the spec.

## [1.1.0] - 2026-06-15

Hardening release: scaling, tooling, and an honesty pass in response to review.

### Spec
- **§8 Scaling** ([SPEC.md](SPEC.md#8-scaling-to-large-repositories--monorepos)): **hierarchical (sharded)
  genomes** - one `.aigx/` per package/workspace, each `files.aigx` scoping its own subtree - and
  **per-file resolution** (O(1) lookup), so context cost is bounded on monorepos. Backwards-compatible.

### Tooling
- **`aigx-lint`** ([tools/aigx-lint](tools/aigx-lint/)): zero-dependency validator + resolver. Checks every
  `<file path>` exists and every `<check>` id resolves (CI-enforceable freshness - the genome can't silently
  rot), and resolves any file's boundary entry in O(1).

### Docs
- **[docs/limitations.md](docs/limitations.md)**: full scope, threats-to-validity, and point-by-point
  responses to the strongest critiques (monorepo scale, developer experience, the statistical tie, mode &
  capability dependence, and the "locality" precision fix).
- Honesty pass across README and BENCHMARK: the cover now states the **mean-tie up front** and leads with
  the defensible claims (cross-tier consistency, robustness, simplicity, only-one-measured).
- Reframed principle **L2** as *per-file addressability* (not physical colocation) for precision.

## [1.0.0] - 2026-06-15

The first public release of AIGX (AI Genome Exchange).

### Spec
- **Normative v1.0 specification** ([SPEC.md](SPEC.md)): the `.aigx/` directory layout; the read protocol;
  per-concern rule files with stable namespaced ids; the per-file **boundary index** (`files.aigx`) with
  `role` / `forbid` / `gotcha` / `check`; per-domain cards; the agent addendum; semantic-parity rules for
  transforms; and a conformance definition.

### Evidence
- **Benchmark** ([BENCHMARK.md](BENCHMARK.md)): controlled ablation over 18+ context formats, scored by a
  deterministic tamper-proof pipeline. AIGX was the only format to rank first on *both* Claude Haiku 4.5
  and Sonnet 4.6 at n=60 (the top formats tie on the mean), surviving ~24 challenger variants across 6
  research rounds.

### Docs & assets
- README, the genome concept, the seven design principles, an authoring guide, and an FAQ.
- A complete worked example (`examples/sourcing-app/`) and copy-ready starter templates.
- `llms.txt`, `CITATION.cff`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, MIT `LICENSE`.

[1.1.0]: https://github.com/Lolner95/AIGX/releases/tag/v1.1.0
[1.0.0]: https://github.com/Lolner95/AIGX/releases/tag/v1.0.0
