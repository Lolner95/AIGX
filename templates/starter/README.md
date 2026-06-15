# Starter genome

Copy the `.aigx/` directory here into your repository root and fill in the `TODO`s:

```bash
cp -r templates/starter/.aigx /path/to/your/repo/.aigx
```

Then follow the [authoring guide](../../docs/authoring-guide.md). In short:

1. Write your rules in the per-concern files (`architecture.aigx`, and copy that pattern for `data.aigx`,
   `auth.aigx`, `testing.aigx`, …). Give each rule a stable id.
2. Fill in `files.aigx` - one entry per file an agent will edit, with its `role`, optional `forbid`, one
   `gotcha`, and the `check` ids. **This is the keystone; spend your time here.**
3. Fill in `product.aigx` (especially the `<freshness>` clause if you have stale docs).
4. Add the [agent addendum](../../SPEC.md#agent-addendum) to your `AGENTS.md` / `CLAUDE.md` / Cursor rule.

Keep it lean - see the [principles](../../docs/principles.md). When in doubt, do less.

## Files included in this starter

| File | Purpose | Required? |
|---|---|---|
| `.aigx/protocol.aigx` | Read protocol - the first thing an agent reads | Yes |
| `.aigx/product.aigx` | Product context + freshness clause | Recommended |
| `.aigx/architecture.aigx` | Architecture rules (ARCH-* ids) | Yes (≥1 concern file) |
| `.aigx/files.aigx` | Per-file boundary index - the keystone | Yes |
| `.aigx/engineering.aigx` | Hard-correctness invariants (ENG-* ids) | Optional but recommended |

Copy additional concern files by duplicating `architecture.aigx` and renaming (`data.aigx`, `auth.aigx`,
`testing.aigx`, `performance.aigx`, …).

## Validating your genome

Once you have a few entries in `files.aigx`:

```bash
# From your repo root
python path/to/aigx/tools/aigx-lint/aigx_lint.py --root .
```

Wire this into CI so a renamed file fails the build rather than silently drifting.
