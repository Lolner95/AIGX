# AIGX TextMate grammar

[`aigx.tmLanguage.json`](aigx.tmLanguage.json) is the **canonical** TextMate-compatible grammar for the
AIGX (AI Genome Exchange) format (`scopeName: source.aigx`, file type `.aigx`). It is the single source of
truth for syntax highlighting and is reused everywhere a TextMate grammar is accepted:

| Target | How to use it |
|---|---|
| **VS Code** | Bundled at [`editors/vscode/syntaxes/aigx.tmLanguage.json`](../vscode/syntaxes/aigx.tmLanguage.json) (a copy of this file). |
| **GitHub Linguist** | Reference this grammar in a `languages.yml` entry for `AIGX` (a Linguist PR uses TextMate grammars for highlighting). |
| **Zed** | Point a language config's `grammar`/`highlights` at it (or convert to Zed's tree-sitter highlights). |
| **Sublime Text** | Load via the PackageDev "Convert (JSON) tmLanguage" or use directly as `.tmLanguage.json`. |
| **TextMate** | Use directly as a language grammar bundle. |
| **Cursor / Windsurf** | VS Code-compatible — install the AIGX extension or drop the grammar in. |

## What it highlights

- Root genome elements (`<aigx-protocol>`, `<aigx-files>`, `<aigx-architecture>`, …)
- The keystone tags `<file>` and `<rule>`, plus `role` / `forbid` / `gotcha` / `check` / `step` / `fact` …
- Attributes (`id`, `path`, `domain`, `pri`, `version`, `n`, `key`) and their quoted values
- **Rule ids** (`PREFIX-SLUG`) — highlighted in attribute values *and* in `<check>` bodies
- `pri="CRIT"` — the salience marker, emphasized
- XML comments and character entities (`&lt;`, `&amp;`, …)

## Keeping copies in sync

This file is canonical. The VS Code copy must match it. From the repo root:

```bash
cp editors/textmate/aigx.tmLanguage.json editors/vscode/syntaxes/aigx.tmLanguage.json
```
