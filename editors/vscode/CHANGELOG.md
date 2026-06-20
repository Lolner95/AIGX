# Change Log — AIGX Language Support

## [0.1.0] - 2026-06-20

Initial release.

- Syntax highlighting via the shared AIGX TextMate grammar (`source.aigx`).
- File icons for `.aigx` and for `protocol/files/architecture/product/testing.aigx`, plus an optional
  **AIGX File Icons** theme.
- Snippets for every AIGX construct.
- Autocomplete: standard tags after `<`, and rule-id completion inside `<check>` sourced from the genome.
- Hover on rule ids (shows the rule text); go-to rule definition.
- Inline diagnostics matching `aigx-lint`: dangling checks, stale paths, duplicate rule ids, path escapes.
- Document formatting (parity-safe whitespace normalization).
- `AIGX: Resolve current file's boundary`, `AIGX: Lint genome` commands.
