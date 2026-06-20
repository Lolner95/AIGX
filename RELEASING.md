# Releasing AIGX

How to cut a release and publish the package ecosystem. Two commands do the safe parts; the actual uploads
need you to be logged in to each registry.

```bash
node scripts/release.mjs check      # or: npm run release:check
node scripts/release.mjs dry-run    # or: npm run release:dry-run   (no uploads, no credentials)
node scripts/release.mjs publish <npm|pypi|cargo|vscode|all>        # after you authenticate
```

`check` and `dry-run` never upload and never need credentials. Run `dry-run` until it's green, then publish.

---

## Versioning model

The **specification** is versioned independently of the **tools** (see
[`standard/change-control.md`](standard/change-control.md)). The tools do not share one number; each track
moves on its own. `release.mjs check` prints the current table and verifies each manifest matches its
in-source constant:

| Artifact | Registry | Version source |
|---|---|---|
| `aigx` (CLI) | npm | `packages/aigx/package.json` (+ `VERSION` const in `bin/aigx.mjs`) |
| `@aigx/parser` | npm | `packages/parser/package.json` |
| `@aigx/lint` | npm | `packages/lint/package.json` |
| `create-aigx` | npm | `package.json` (repo root) |
| `aigx` (validator) | PyPI | `pyproject.toml` (+ `__version__` in `tools/aigx-lint/aigx_lint.py`) |
| `aigx` (CLI) | crates.io | `crates/aigx/Cargo.toml` |
| AIGX Language Support | VS Code Marketplace | `editors/vscode/package.json` |

Bump the version(s) you changed, update [`CHANGELOG.md`](CHANGELOG.md), then run `check`.

---

## 1. Preflight & dry-run

```bash
node scripts/release.mjs dry-run
```

This runs the gates (genome lint, the 3-validator conformance suite, format check), then a **dry-run of
every registry**: `npm publish --dry-run` per package, `cargo publish --dry-run`, `python -m build` +
`twine check`, and `vsce package`. Tools that aren't installed are reported as skipped — install them to
exercise those paths (`pip install build twine`, `npm i -g @vscode/vsce`, Rust toolchain).

---

## 2. Publish per registry

### npm — `aigx`, `@aigx/parser`, `@aigx/lint`, `create-aigx`
```bash
npm login
node scripts/release.mjs publish npm
```
Publishes in dependency order: `@aigx/parser` → `@aigx/lint` → `aigx` → `create-aigx`. Scoped packages use
`--access public` (first publish of a scope). Equivalent manual commands:
```bash
npm publish --workspace @aigx/parser --access public
npm publish --workspace @aigx/lint   --access public
npm publish --workspace @aigx/cli     --access public
npm publish                            # create-aigx (repo root)
```

### PyPI — `aigx`
```bash
pip install build twine
node scripts/release.mjs publish pypi      # python -m build && twine upload dist/*
```
Use TestPyPI first if you want a rehearsal: `twine upload --repository testpypi dist/*`.

### crates.io — `aigx`
```bash
cargo login           # paste your crates.io token
node scripts/release.mjs publish cargo     # cargo publish --manifest-path crates/aigx/Cargo.toml
```

### VS Code Marketplace — AIGX Language Support
The manifest's `publisher` (`editors/vscode/package.json`) must be a Marketplace publisher you own, and add
a 128×128 PNG `icon` before publishing. Then:
```bash
npm i -g @vscode/vsce
cd editors/vscode && vsce login <publisher> && cd -
node scripts/release.mjs publish vscode    # npx @vscode/vsce publish
```
Also mirror to **Open VSX** (used by Cursor, Windsurf, VSCodium): `npx ovsx publish -p <token>`.

### Everything at once
```bash
node scripts/release.mjs publish all       # after all logins above
```

---

## 3. GitHub release

```bash
git tag -a vX.Y.Z -m "AIGX X.Y.Z — <summary>"
git push origin main && git push origin vX.Y.Z
gh release create vX.Y.Z --title "AIGX X.Y.Z — <summary>" --notes-file <notes> --latest
```
Per [`standard/change-control.md`](standard/change-control.md), the notes should record the spec version,
the tool versions, breaking changes, migration notes, and a pointer to the conformance suite.

> **Heads-up (CI workflow):** changing files under `.github/workflows/` requires a token with the
> `workflow` scope. If a push is rejected for that reason, run `gh auth refresh -s workflow` (or use a PAT
> with `workflow`) and push the workflow change separately.
