# Changelog

All notable changes to the AIGX specification and repository are documented here. This project adheres to
[Semantic Versioning](https://semver.org) for the spec.

## [Unreleased]

### Spec
- **§2 Semantic rule ids** ([SPEC.md](SPEC.md#2-file-naming-and-rule-ids)): ids can now be
  `PREFIX-slug` (e.g. `ARCH-no-deep-imports`) in addition to `PREFIX-N`. Semantic slugs are
  recommended for new genomes — `<check>` lists become self-documenting. Fully backward-compatible.
- **§10 JIT Context Hydration** ([SPEC.md](SPEC.md)): documented MCP tool, pre-prompt injection, and
  editor-extension patterns for pre-loading genome entries before inference. Normative recommendation,
  not a required format change.

### Tooling
- **`aigx-sync`** ([tools/aigx-sync](tools/aigx-sync/)): zero-dependency git pre-commit hook that
  auto-patches `files.aigx` path attributes when source files are renamed or moved. Drift becomes
  physically impossible at the commit boundary.
- **`create-aigx`** npm package: `npx create-aigx` scaffolds a starter genome (protocol, product,
  architecture, engineering, files, agent) into the current directory. Zero dependencies, Node 18+.

### Templates
- **`agent.aigx`** ([templates/starter/.aigx/agent.aigx](templates/starter/.aigx/agent.aigx)):
  seven `AGENT-*` rules that teach an AI agent to be a genome steward — sync renames, add entries for
  new files, keep rule text current, verify after task, avoid speculative bloat. Scaffolded by
  `create-aigx` automatically.

### Docs
- **[docs/jit-hydration.md](docs/jit-hydration.md)**: full JIT hydration guide with MCP tool
  definition, Python pre-prompt injection code, editor extension pattern, and when NOT to use it.
- **[docs/limitations.md](docs/limitations.md)** §6 expanded: point-by-point responses to the
  three developer critiques (stale sidecars → `aigx-sync`, opaque ids → semantic slugs, N+1 reads →
  JIT hydration) plus `agent.aigx` for genome self-maintenance.
- **[docs/authoring-guide.md](docs/authoring-guide.md)**: Step 1 updated with semantic id guidance
  and a numeric-vs-semantic comparison table.

### Repo & structure
- **Meta-genome** (`.aigx/` at repo root): AIGX now uses itself — 4 files (protocol, architecture,
  files, agent) describing the SPEC.md, tooling, and genome maintenance rules for this repo.
- **`integrations/`**: plug-and-play config files for 7 tools (Cursor, Claude Code, GitHub Copilot,
  Windsurf, Aider, GitHub Actions CI, VS Code). Each file is ready to copy, with a
  [`integrations/README.md`](integrations/README.md) explaining installation per tool.
- **`template/aigx/`**: `.aigx` source files moved to a named subdirectory so `create-aigx` can
  co-locate integration templates under `template/integrations/`.
- **`template/integrations/`**: integration templates read by `create-aigx` during scaffolding.
- **`bin/create-aigx.mjs`** rewritten: now scaffolds the full integration suite on top of `.aigx/` —
  `.cursor/rules/aigx.mdc`, `CLAUDE.md` (appends if exists), `.github/copilot-instructions.md`,
  `.github/workflows/aigx-validate.yml`, `.windsurfrules`. Added `--aigx-only` flag to skip
  integrations. Zero new dependencies.
- **README** quick-start updated to lead with `npx create-aigx`; tool support table updated with links
  to `integrations/`; repo layout updated to reflect new directories.

### Planned
- VS Code extension — hover a source file, see its `.aigx` boundary inline
- Monorepo-scale benchmark (5k+ files) - specification is in place, measurement is future work
- Additional worked examples: Python (FastAPI), Go, monorepo

---

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

[Unreleased]: https://github.com/Lolner95/AIGX/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Lolner95/AIGX/releases/tag/v1.1.0
[1.0.0]: https://github.com/Lolner95/AIGX/releases/tag/v1.0.0
