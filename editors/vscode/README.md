# AIGX Language Support

First-class editor support for **AIGX (AI Genome Exchange)** genomes — the open, benchmark-validated
context format for AI coding agents. Zero-config: open any `.aigx` file and it just works.

## Features

- **Syntax highlighting** — tags, attributes, rule ids (`PREFIX-SLUG`), `pri="CRIT"`, entities, comments.
- **File icons** — a distinct icon for `.aigx` and for `protocol.aigx`, `files.aigx`, `architecture.aigx`,
  `product.aigx`, `testing.aigx` (enable **AIGX File Icons** via *Preferences: File Icon Theme*).
- **Snippets** — `protocol`, `files`, `file`, `rule`, `concern`, `forbid`, `gotcha`, `check`, `product`,
  `domain`.
- **Autocomplete** — standard AIGX tags after `<`, and **rule-id completion inside `<check>`** drawn from
  your genome (with the rule text as documentation).
- **Hover** — hover any rule id to read its full rule text and source concern file.
- **Go to definition** — jump from a `<check>` id (or any rule id) to its `<rule id="…">` declaration.
- **Diagnostics** — the same checks as `aigx-lint`, inline: dangling `<check>` ids, stale/missing
  `<file path>`, duplicate rule ids, and paths that escape the repository root.
- **Format document** — parity-safe whitespace normalization (matches `aigx format`).
- **Resolve current file's boundary** — run **AIGX: Resolve current file's boundary** (also in the editor
  context menu) on any source file to see its `role`, `forbid`, `gotcha`, and `check` ids.

## Commands

| Command | What it does |
|---|---|
| `AIGX: Resolve current file's boundary` | Show the active file's `files.aigx` entry |
| `AIGX: Lint genome` | Validate every genome in the workspace |
| `AIGX: Go to rule definition` | Jump to the rule under the cursor |

## Settings

- `aigx.diagnostics.enabled` (default `true`)
- `aigx.diagnostics.run` — `onType` (default) or `onSave`
- `aigx.format.normalizeBlankLines` (default `true`)

## How it relates to the CLI

This extension is self-contained (no external process required), implementing the same validation and
resolution semantics as the [`aigx` CLI](https://github.com/Lolner95/AIGX/tree/main/packages/aigx) and the
Python/Rust reference validators. For CI, use `aigx lint`; in the editor, this extension gives you the same
signal live.

## Roadmap

- **0.1** — highlighting, icons, snippets, diagnostics, hover, definition, format, resolve ✅ (this release)
- **1.0** — a full Language Server (LSP) so the same intelligence runs in any LSP-capable editor.

Specification: <https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.md> · License: MIT.
