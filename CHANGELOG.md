# Changelog

All notable changes to the AIGX specification and repository are documented here. This project adheres to
[Semantic Versioning](https://semver.org) for the spec.

## [Unreleased]

### Planned
- Language Server (LSP) — the same editor intelligence in any LSP-capable editor
- Monorepo-scale benchmark (5k+ files) — specification is in place, measurement is future work
- Additional worked examples: Python (FastAPI), Go, monorepo
- Publish the ecosystem to npm / PyPI / Cargo / the VS Code Marketplace

---

## [1.3.3] - 2026-06-20

AIGX is now published on **all three package registries**.

### Published
- **PyPI:** [`aigx 1.2.0`](https://pypi.org/project/aigx/) — `pip install aigx` (Python reference validator).
- **crates.io:** [`aigx 1.2.0`](https://crates.io/crates/aigx) — `cargo install aigx` (Rust reference validator/CLI).
- (npm landed in 1.3.2 — `@aigx/cli`, `@aigx/parser`, `@aigx/lint`, `create-aigx`.)

So every reference implementation is installable from its native registry: `npm i -g @aigx/cli`,
`pip install aigx`, `cargo install aigx`, and `npm create aigx`.

---

## [1.3.2] - 2026-06-20

First publish to npm. The CLI ships as **`@aigx/cli`** — npm reserves the bare `aigx` name (typosquat
filter), so the package is scoped under the `aigx` org; the installed **command is still `aigx`**.

### Published to npm
- `@aigx/parser@1.2.0`, `@aigx/lint@1.2.0`, `@aigx/cli@1.3.1`, and `create-aigx@1.3.1` are live. Scaffold
  with `npm create aigx` / `npx create-aigx`; run the CLI with `npm i -g @aigx/cli` (or `npx @aigx/cli`).

### Tooling
- **Release harness** ([scripts/release.mjs](scripts/release.mjs); `npm run release:check` /
  `npm run release:dry-run`): preflight (version table + in-source consistency + lint/conformance/format)
  plus credential-free dry-runs of every registry, and a `publish <target>` path. Guide in
  [RELEASING.md](RELEASING.md).

### Fixed
- Updated every `npx aigx` / `npm i -g aigx` reference to `@aigx/cli` — the CLI's scaffolded CI
  (`aigx init`), `create-aigx`'s output, the README / 60-seconds / RELEASING docs, the release harness, and
  the meta-genome. (`pip install aigx` and `cargo install aigx` are unchanged — those packages are `aigx`.)
- `@aigx/cli` and `create-aigx` bumped to 1.3.1 with the corrected references.

---

## [1.3.1] - 2026-06-20

Editor ecosystem: `.aigx` now highlights across more surfaces — including GitHub — all from one canonical grammar.

### Editors
- **GitHub highlighting** ([.gitattributes](.gitattributes)): `.aigx` renders with XML highlighting on
  GitHub today (kept out of the language bar) — interim until AIGX lands in Linguist.
- **GitHub Linguist kit** ([editors/linguist](editors/linguist/)): a `languages.yml` entry
  (`tm_scope: source.aigx`), a sample, and a step-by-step PR guide to register AIGX in github/linguist.
- **TextMate bundle** ([editors/textmate/AIGX.tmbundle](editors/textmate/)): wraps the canonical grammar.
- **Sublime Text** ([editors/sublime](editors/sublime/)): a native `aigx.sublime-syntax`.
- **Zed** ([editors/zed](editors/zed/)) + a **tree-sitter grammar** ([editors/tree-sitter-aigx](editors/tree-sitter-aigx/)):
  extension + grammar source (experimental — needs `tree-sitter generate`).
- **[editors/README.md](editors/README.md)** ecosystem index; meta-genome rule `ARCH-grammar-canonical`
  updated so every derivation (VS Code copy, tmbundle, Sublime, tree-sitter) stays in sync with the canonical grammar.

---

## [1.3.0] - 2026-06-20

Editor support + a world-class adoption kit. The specification version stays **1.1**.

### Editors
- **TextMate grammar** ([editors/textmate](editors/textmate/)): the canonical `source.aigx` grammar —
  tags, attributes, rule ids (`PREFIX-SLUG`), `pri="CRIT"`, entities, comments — reusable across VS Code,
  GitHub Linguist, Zed, Sublime Text, TextMate, Cursor, and Windsurf.
- **VS Code extension "AIGX Language Support"** ([editors/vscode](editors/vscode/)): syntax highlighting,
  file icons (`.aigx` plus `protocol/files/architecture/product/testing.aigx`) and an optional icon theme,
  snippets, tag + rule-id autocomplete, hover on rule ids, go-to rule definition, inline diagnostics
  (matching `aigx-lint`), document formatting, and an **AIGX: Resolve current file's boundary** command.
  Self-contained (the `vscode` API + Node + a local offset-aware genome library; no npm runtime deps).

### Tooling
- **`create-aigx` is now interactive** ([bin/create-aigx.mjs](bin/create-aigx.mjs)): pick your agent(s)
  — Cursor, Claude Code, Copilot, Windsurf, Aider, or a generic `AGENTS.md` — choose CI, and get a gradient
  scaffold with per-file confirmation. Non-interactive fallback + per-agent flags (`--cursor …`, `--yes`,
  `--aigx-only`, `--no-ci`) keep `npx create-aigx` automation-friendly. Bumped to **1.3.0**.
- **`aigx init` parity** ([packages/aigx](packages/aigx/)): the same interactive agent selection and
  embedded integrations, fully self-contained. The `aigx` CLI is bumped to **1.3.0**.
- **New integration templates**: `aider.conf.yml` and a generic `AGENTS.md`
  ([integrations/agents](integrations/agents/)), wired into both scaffolders.

### Repo & structure
- **`editors/`** directory added; the meta-genome now indexes the grammar, the extension entry, and its
  genome library, with rules for grammar-canonicalness (`ARCH-grammar-canonical`) and editor
  zero-dependency (`ARCH-editor-zero-dep`).

---

## [1.2.0] - 2026-06-20

Standardization release. AIGX becomes a citable standard (the `standard/` directory), gains a real CLI
(`aigx`) and an npm package ecosystem (`aigx`, `@aigx/parser`, `@aigx/lint`), and ships plug-and-play agent
integrations. The spec version stays **1.1**; this is a tooling and repository release.

### Spec & standard
- **`standard/` directory** — the normative standard set: [`AIGX-1.1.md`](standard/AIGX-1.1.md) (20-section
  normative specification in RFC 2119 language), [`AIGX-1.1.abnf`](standard/AIGX-1.1.abnf) (formal grammar,
  RFC 5234), [`AIGX-1.1.schema.json`](standard/AIGX-1.1.schema.json) (canonical JSON data model, JSON Schema
  2020-12), [`media-type-registration.md`](standard/media-type-registration.md) (IANA template for
  `application/aigx`), and the security / conformance / interoperability / change-control documents.
- **Dual licensing** — specification text under CC-BY-4.0 ([`standard/LICENSE`](standard/LICENSE)); the
  reference tools remain MIT. Open spec + permissive tools, so AIGX can be reimplemented freely.
- **Media type** — `application/aigx` (UTF-8), deliberately not `+xml` (AIGX does not mandate strict XML
  well-formedness).

### Spec (informal)
- **§2 Semantic rule ids** ([SPEC.md](SPEC.md#2-file-naming-and-rule-ids)): ids can now be
  `PREFIX-slug` (e.g. `ARCH-no-deep-imports`) in addition to `PREFIX-N`. Semantic slugs are
  recommended for new genomes — `<check>` lists become self-documenting. Fully backward-compatible.
- **§10 JIT Context Hydration** ([SPEC.md](SPEC.md)): documented MCP tool, pre-prompt injection, and
  editor-extension patterns for pre-loading genome entries before inference. Normative recommendation,
  not a required format change.

### Tooling
- **`aigx` CLI** ([packages/aigx](packages/aigx/)): the flagship command-line tool. Zero-dependency,
  self-contained Node (templates embedded). Commands: `init`, `lint`, `resolve`, `doctor`, `format`,
  `check-conformance`. `npm i -g @aigx/cli` or `npx @aigx/cli`. Supports `.aigxignore` / `--exclude` for nested
  independent genomes.
- **`@aigx/parser`** ([packages/parser](packages/parser/)): the reference zero-dependency genome parser;
  text-in/data-out functions whose output matches the canonical JSON schema.
- **`@aigx/lint`** ([packages/lint](packages/lint/)): programmatic validator built on `@aigx/parser`,
  implementing conformance checks V1–V7. Kept in parity with the Python `aigx-lint`.
- **`aigx` (Rust crate)** ([crates/aigx](crates/aigx/)): `cargo install aigx` — a std-only (zero external
  crates) Rust reference validator/CLI (`lint`, `resolve`, `init`). A third independent implementation,
  held in agreement with the Node and Python validators by the conformance suite.
- **`aigx` (PyPI)** ([pyproject.toml](pyproject.toml)): `pip install aigx` ships the Python reference
  validator as the `aigx` / `aigx-lint` commands.
- **Python validator parity** ([tools/aigx-lint](tools/aigx-lint/)): `aigx-lint` upgraded to full V1–V7 +
  S2 coverage (required files, duplicate rule ids, path-escape) and now honors `.aigxignore` / `--exclude`,
  so it reports the same pass/fail as the Node and Rust validators. Subcommand aliases (`aigx lint`,
  `aigx resolve PATH`) added for cross-CLI consistency. Version bumped to 1.2.0.
- **`aigx-lint --format json`** ([tools/aigx-lint](tools/aigx-lint/)): machine-readable validate,
  stats, and per-file resolution output for MCP servers, editor extensions, and agent wrappers. `--resolve`
  now exits 0 for existing files that simply have no indexed boundary entry, and XML comments are ignored
  during rule and file-entry parsing per SPEC Â§7.
- **`aigx-mcp`** ([tools/aigx-mcp](tools/aigx-mcp/)): zero-dependency stdio MCP bridge exposing
  `aigx_resolve`, so MCP clients can inject AIGX boundaries before graph/search context.
- **`aigx-export`** ([tools/aigx-export](tools/aigx-export/)): zero-dependency reference serializer with
  explicit renderers, recursive unsafe-value detection, corruption-token output validation, atomic writes,
  SHA-256 readback verification, and handoff guard support for `.aigx` and Markdown exports.
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
- **[docs/aigx-in-60-seconds.md](docs/aigx-in-60-seconds.md)**: the one-screen overview — the minimum
  valid genome, a tiny example, and how an agent uses it.
- **[docs/jit-hydration.md](docs/jit-hydration.md)**: full JIT hydration guide with MCP tool
  definition, JSON resolver output, Python pre-prompt injection code, editor extension pattern, how AIGX
  pairs with code graph memory, and when NOT to use it.
- **[fixtures/corrupted/aigx-brain-object-object-truncated.txt](fixtures/corrupted/aigx-brain-object-object-truncated.txt)**:
  regression fixture for object-coercion/truncation export guards.
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
- **`packages/` workspace**: npm workspaces (`aigx`, `@aigx/parser`, `@aigx/lint`) under one root.
- **`.aigxignore`**: repo-relative exclude list so nested independent genomes (the examples, the site) are
  validated separately rather than as shards of the root genome.
- **Example fixtures**: `examples/minimal` and `examples/sourcing-app` now ship the source files their
  genomes reference, so they pass *real* `aigx lint` (not just `--stats`) and serve as conformance fixtures.
- **CI**: [validate-genome.yml](.github/workflows/validate-genome.yml) now runs real validation with the
  `aigx` CLI (meta-genome + each example + conformance + format check) and a Python-validator parity job.
- **Meta-genome** extended to index the new CLI, packages, `standard/AIGX-1.1.md`, the Rust crate, the
  conformance runner, and `pyproject.toml`, with rules for CLI self-containment, package/crate
  zero-dependency, validator parity, standard governance, and the conformance suite.

### Conformance
- **Conformance suite** ([tests/conformance/](tests/conformance/)): a positive baseline plus five negative
  fixtures (one per V1/V2/V3/V4/S2), and a `run.py` runner that drives the Python, Node, and Rust
  validators and asserts all three agree, fixture-for-fixture ([standard/conformance.md](standard/conformance.md)).
  Three independent implementations in three languages, one verdict. Wired into CI.

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

[Unreleased]: https://github.com/Lolner95/AIGX/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/Lolner95/AIGX/releases/tag/v1.2.0
[1.1.0]: https://github.com/Lolner95/AIGX/releases/tag/v1.1.0
[1.0.0]: https://github.com/Lolner95/AIGX/releases/tag/v1.0.0
