# Starter genome

Copy the `.aigx/` directory here into your repository root and fill in the `TODO`s:

```bash
cp -r templates/starter/.aigx /path/to/your/repo/.aigx
```

Then follow the [authoring guide](../../docs/authoring-guide.md). In short:

1. Write your rules in the per-concern files (`architecture.aigx`, and copy that pattern for `data.aigx`,
   `auth.aigx`, `testing.aigx`, …). Give each rule a stable id.
2. Fill in `files.aigx` — one entry per file an agent will edit, with its `role`, optional `forbid`, one
   `gotcha`, and the `check` ids. **This is the keystone; spend your time here.**
3. Fill in `product.aigx` (especially the `<freshness>` clause if you have stale docs).
4. Add the [agent addendum](../../SPEC.md#agent-addendum) to your `AGENTS.md` / `CLAUDE.md` / Cursor rule.

Keep it lean — see the [principles](../../docs/principles.md). When in doubt, do less.
