# AIGX for Zed

Syntax highlighting for `.aigx` (AI Genome Exchange) files in [Zed](https://zed.dev).

> **Status: experimental — build required.** Zed highlights with **tree-sitter**, so this extension needs a
> compiled grammar. The grammar source is [`editors/tree-sitter-aigx`](../tree-sitter-aigx); it has not been
> generated/published yet, and `extension.toml` pins a placeholder `commit`. Finish the two steps below to
> make it work. (For an editor that works today, use the [VS Code extension](../vscode/).)

## Make it work

1. **Generate + test the grammar:**
   ```bash
   cd editors/tree-sitter-aigx
   npx tree-sitter-cli generate
   npx tree-sitter-cli test   # add corpus tests under test/corpus/ as you refine it
   ```
2. **Publish the grammar** (its own repo, or keep it here) and set `commit` (and `path`, if in this repo)
   in [`extension.toml`](extension.toml) to the published revision.
3. **Install as a dev extension:** in Zed, run **`zed: install dev extension`** and pick this `editors/zed`
   folder.

## What it highlights

`config.toml` + `languages/aigx/highlights.scm` map the grammar to Zed scopes: tags, attribute names,
attribute values (strings), **rule ids** (`PREFIX-SLUG`), `pri="CRIT"`, entities, and comments — the same
visual language as the [canonical grammar](../textmate/).
