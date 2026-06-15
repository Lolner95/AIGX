# Roadmap

This roadmap tracks planned work for the AIGX specification, tooling, and examples. Items are organized
by theme. Dates are not committed; order reflects priority.

The **[CHANGELOG](../CHANGELOG.md)** is the authoritative record of what shipped; this doc is the
forward-looking view.

---

## Exporters

**Goal:** generate a flat `AGENTS.md`, `CLAUDE.md`, or `.cursor/rules` file from an AIGX genome, so
teams whose tools only read flat files can still benefit from an AIGX genome as their source of truth.

- `aigx export --format agents-md` - flatten to `AGENTS.md`
- `aigx export --format claude-md` - flatten to `CLAUDE.md`
- `aigx export --format cursor-rules` - flatten to `.cursor/rules/*.mdc`

Exporters are semantics-preserving projections (per [SPEC.md §5](../SPEC.md#5-semantic-parity-for-tools-that-transform-genomes)): all rule ids and file boundaries survive the transform.

**Status:** not started. Contribution welcome - see [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## VS Code extension

**Goal:** hover a source file in VS Code and see its `.aigx` boundary inline - role, forbid, gotcha, and
check ids - without leaving the editor.

- Extension reads the nearest `files.aigx` and resolves the hovered file's entry via `aigx-lint --resolve`.
- Shows boundary in a hover card or status-bar tooltip.
- Highlights files with a `<forbid>` in the explorer tree.

**Status:** not started. Contribution welcome.

---

## More worked examples

**Goal:** show AIGX applied to stacks beyond TypeScript.

| Example | Stack | Status |
|---|---|---|
| `examples/sourcing-app/` | TypeScript + React + Node | Shipped |
| `examples/minimal/` | Any (3-file skeleton) | Shipped |
| `examples/python-fastapi/` | Python + FastAPI + SQLAlchemy | Planned |
| `examples/go-service/` | Go + stdlib + Postgres | Planned |
| `examples/monorepo/` | TypeScript monorepo (2 packages) | Planned |

---

## Monorepo-scale benchmark

**Goal:** replicate the benchmark at 5k-50k file scale with a hierarchical genome, to validate the
scaling claims in [SPEC.md §8](../SPEC.md#8-scaling-to-large-repositories--monorepos).

**Status:** not started. Independent replications especially welcome - open an issue with your setup and
numbers whether you confirm or challenge the result.

---

## MCP integration

**Goal:** expose `aigx-lint --resolve <path>` as an MCP tool so AI agents using the Model Context
Protocol can call it directly for O(1) per-file resolution without loading a whole index.

**Status:** design exploration.

---

## aigx-lint improvements

- `--watch` mode: re-validate on file change (local dev ergonomics)
- JSON output (`--format json`) for downstream tooling
- Autofix suggestions for common errors (moved-file rename, dangling check id)

**Status:** planned.
