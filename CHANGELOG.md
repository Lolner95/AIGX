# Changelog

All notable changes to the AIGX specification and repository are documented here. This project adheres to
[Semantic Versioning](https://semver.org) for the spec.

## [1.0.0] — 2026-06-15

The first public release of AIGX (AI Genome Exchange).

### Spec
- **Normative v1.0 specification** ([SPEC.md](SPEC.md)): the `.aigx/` directory layout; the read protocol;
  per-concern rule files with stable namespaced ids; the per-file **boundary index** (`files.aigx`) with
  `role` / `forbid` / `gotcha` / `check`; per-domain cards; the agent addendum; semantic-parity rules for
  transforms; and a conformance definition.

### Evidence
- **Benchmark** ([BENCHMARK.md](BENCHMARK.md)): controlled ablation over 18+ context formats, scored by a
  deterministic tamper-proof pipeline. AIGX ranked #1 on mean, pass@1, and hidden-test pass on Claude
  Haiku 4.5 and Sonnet 4.6 at n=60, surviving ~24 challenger variants across 6 research rounds.

### Docs & assets
- README, the genome concept, the seven design principles, an authoring guide, and an FAQ.
- A complete worked example (`examples/sourcing-app/`) and copy-ready starter templates.
- `llms.txt`, `CITATION.cff`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, MIT `LICENSE`.

[1.0.0]: https://github.com/USER/aigx/releases/tag/v1.0.0
