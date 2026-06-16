# Integrations

Ready-to-use config files for every major AI coding agent. Each file tells the agent how to use the AIGX genome in your project.

## Quickest path: `npx create-aigx`

Running `npx create-aigx` in your project root scaffolds **all of these automatically** — plus the `.aigx/` genome itself. That's the recommended path.

## Manual installation (pick what you need)

| Tool | File to copy | Destination |
|---|---|---|
| **Cursor** | [`cursor/aigx.mdc`](cursor/aigx.mdc) | `.cursor/rules/aigx.mdc` |
| **Claude Code** | [`claude-code/CLAUDE.md`](claude-code/CLAUDE.md) | Append to your `CLAUDE.md` |
| **GitHub Copilot** | [`copilot/copilot-instructions.md`](copilot/copilot-instructions.md) | `.github/copilot-instructions.md` |
| **Windsurf** | [`windsurf/windsurfrules`](windsurf/windsurfrules) | `.windsurfrules` |
| **Aider** | [`aider/aider.conf.yml`](aider/aider.conf.yml) | `.aider.conf.yml` |
| **GitHub Actions CI** | [`github-actions/aigx-validate.yml`](github-actions/aigx-validate.yml) | `.github/workflows/aigx-validate.yml` |
| **VS Code** | [`vscode/extensions.json`](vscode/extensions.json) | `.vscode/extensions.json` |

### Cursor

```bash
mkdir -p .cursor/rules
cp path/to/aigx/integrations/cursor/aigx.mdc .cursor/rules/aigx.mdc
```

The MDC rule has `alwaysApply: true` — Cursor loads it on every task automatically.

### Claude Code

Append the AIGX section to your existing `CLAUDE.md`:

```bash
cat path/to/aigx/integrations/claude-code/CLAUDE.md >> CLAUDE.md
```

Or if you don't have a `CLAUDE.md` yet, copy it directly:

```bash
cp path/to/aigx/integrations/claude-code/CLAUDE.md CLAUDE.md
```

### GitHub Copilot

```bash
mkdir -p .github
cp path/to/aigx/integrations/copilot/copilot-instructions.md .github/copilot-instructions.md
```

### Windsurf

```bash
cp path/to/aigx/integrations/windsurf/windsurfrules .windsurfrules
```

### Aider

```bash
cp path/to/aigx/integrations/aider/aider.conf.yml .aider.conf.yml
```

This adds `.aigx/protocol.aigx` and `.aigx/agent.aigx` as read-only context on every Aider session.

### GitHub Actions CI

```bash
mkdir -p .github/workflows
cp path/to/aigx/integrations/github-actions/aigx-validate.yml .github/workflows/aigx-validate.yml
```

This validates your genome on every push/PR that touches `.aigx/` files. Catches moved/missing files and dangling check ids before they merge.

---

## What each integration does

All integrations do the same thing: tell the agent **three things**:

1. **Read protocol** — before editing a file, look up its `<file>` entry in `files.aigx` and obey the `<forbid>` / `<gotcha>` / `<check>`
2. **Maintenance rules** — when renaming files, adding files, or changing code that makes rules stale, update the genome in the same change-set
3. **Validate** — run `aigx-lint --root .` to check the genome is in sync

They differ only in format (MDC, Markdown, YAML) to match what each tool expects.

---

## Keeping integrations current

The content in `integrations/` is the source of truth. The `template/integrations/` copies are what `create-aigx` reads when scaffolding — they must match.

If you update an integration file, update both locations:
```
integrations/<tool>/   ←→   template/integrations/
```

The AIGX genome at the repo root (`.aigx/files.aigx`) enforces this via the `ARCH-integrations-match-template` rule.
