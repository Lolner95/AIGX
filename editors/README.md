# AIGX editor support

`.aigx` genome files, highlighted and understood everywhere you work. Everything here derives from one
**canonical grammar**, [`textmate/aigx.tmLanguage.json`](textmate/aigx.tmLanguage.json)
(`scopeName: source.aigx`).

| Editor / surface | What's here | Status |
|---|---|---|
| **VS Code / Cursor / Windsurf** | [`vscode/`](vscode/) — full extension: highlighting, icons, snippets, autocomplete, hover, go-to-definition, diagnostics, format, resolve | ✅ ready |
| **GitHub** | [`../.gitattributes`](../.gitattributes) highlights `.aigx` as XML today; [`linguist/`](linguist/) is the kit to register AIGX in github/linguist | ✅ interim · 📨 PR kit |
| **Sublime Text** | [`sublime/`](sublime/) — native `aigx.sublime-syntax` | ✅ ready |
| **TextMate** | [`textmate/AIGX.tmbundle/`](textmate/) — bundle wrapping the grammar | ✅ ready |
| **Zed** | [`zed/`](zed/) + [`tree-sitter-aigx/`](tree-sitter-aigx/) grammar source | 🧪 needs `tree-sitter generate` |
| **Any TextMate-compatible editor** | the canonical grammar in [`textmate/`](textmate/) | ✅ ready |

## One grammar, many targets

The canonical grammar is the single source of truth. The other formats are copies or ports of it:

- VS Code bundles a copy at `vscode/syntaxes/aigx.tmLanguage.json`.
- The TextMate bundle wraps a copy at `textmate/AIGX.tmbundle/Syntaxes/`.
- Sublime has a native `.sublime-syntax` port; Linguist references `tm_scope: source.aigx`.
- Zed uses a tree-sitter port (`tree-sitter-aigx`).

When you change highlighting, change the canonical grammar first, then update the derivations
(meta-genome rule `ARCH-grammar-canonical`). For the editor with the deepest integration — diagnostics,
hover, go-to-definition, resolve — use **[VS Code](vscode/)**.
