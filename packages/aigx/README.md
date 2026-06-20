# aigx

The command-line tool for **AIGX — AI Genome Exchange**, the benchmark-validated, per-file context format
for AI coding agents. Zero dependencies, Node 18+.

```bash
npm install -g aigx
# or run without installing:
npx aigx <command>
```

## Commands

| Command | What it does |
|---|---|
| `aigx init [--minimal] [--force]` | Scaffold a `.aigx/` genome in the current directory. |
| `aigx lint [--root DIR] [--json]` | Validate the genome(s); exits non-zero on errors (CI-ready). |
| `aigx resolve <path> [--root DIR]` | Print the boundary for one file — role, forbid, gotcha, checks. O(1). |
| `aigx doctor [--root DIR]` | Environment + genome health check with actionable hints. |
| `aigx format [--root DIR] [--check]` | Normalize whitespace in `.aigx` files (parity-safe). |
| `aigx check-conformance [--root DIR]` | Report conformance level (G1–G4, then the recommended practices). |

Global: `--root DIR`, `--exclude DIR` (repeatable; also reads `.aigxignore`), `--version`, `--help`.

## What `aigx lint` checks

- Required files exist (`protocol.aigx`, ≥1 concern file, `files.aigx`)
- Every `<check>` id resolves to a real `<rule id>`
- Every `<file path>` exists on disk (catches renamed/moved/deleted files)
- No duplicate rule ids
- No `<file path>` escapes the repository root
- (warnings) duplicate entries, high `<forbid>` density, unknown root elements

Wire it into CI so a moved file fails the build until its genome entry is fixed — the genome can't silently
rot.

## Example

```bash
$ aigx resolve src/features/meetings/bookMeeting.ts
Applicable genome: .aigx
Role:   Book a meeting (validate slot + contact)
Forbid: NEVER import @/features/suppliers/internal/*   [CRIT]
Gotcha: get contact_email from the suppliers PUBLIC api, never the internal mapper
Checks: ARCH-no-deep-imports, DATA-integer-cents, TEST-failing-first
```

## Nested / monorepo genomes

`aigx` discovers every `.aigx/` under `--root` and treats them as one hierarchical genome (paths resolve
relative to `--root`). To exclude independent nested genomes (vendored examples, separate sub-projects),
list them in a `.aigxignore` file or pass `--exclude DIR`.

## Related

- `npx create-aigx` — scaffold a genome **plus** all agent integrations (Cursor, Claude Code, Copilot, …)
- [`@aigx/parser`](https://www.npmjs.com/package/@aigx/parser) — programmatic genome parsing
- [`@aigx/lint`](https://www.npmjs.com/package/@aigx/lint) — programmatic validation

## Specification

Full normative spec: <https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.md>

## License

MIT © Grégory Parisotto
