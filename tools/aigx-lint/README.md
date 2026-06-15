# aigx-lint

A tiny, **zero-dependency** (Python 3.8+ stdlib) validator and resolver for AIGX genomes. It exists to
kill the two most common objections to a centralized context format - *"it rots"* and *"it won't scale"* -
by making both mechanically false.

## Why

- **It can't rot silently.** `aigx-lint` checks the genome against the **actual repository**: every
  `<file path>` must still exist on disk, and every `<check>` id must resolve to a real `<rule>`. Run it in
  CI or a pre-commit hook and a moved/renamed file **fails the build** until its entry is fixed - the same
  discipline teams already use for `CODEOWNERS` and `tsconfig` path maps.
- **It scales by resolution, not ingestion.** `--resolve PATH` returns just one file's entry, so an agent's
  context cost is **O(1) per edited file**, independent of index size. A 50,000-entry index is one lookup.
- **It understands hierarchical genomes.** Every `.aigx/` directory under the root is discovered; each
  `files.aigx` indexes its own subtree (see [SPEC §8](../../SPEC.md#8-scaling-to-large-repositories--monorepos)).

## Usage

```bash
# Validate the genome(s) under the current repo. Exits non-zero on errors (CI-friendly).
python aigx_lint.py --root .

# Print just one file's boundary entry - constant-cost lookup an agent/MCP can call.
python aigx_lint.py --resolve src/features/meetings/bookMeeting.ts --root .

# Summary: genomes, rules, entries, and the all-important forbid scarcity.
python aigx_lint.py --stats --root .
```

## What validation catches

| Check | Why it matters |
|---|---|
| `<file path>` exists on disk | catches renamed/moved/deleted files → the genome can't go stale unnoticed |
| every `<check>` id resolves to a `<rule>` | catches dangling references when a rule is renamed/removed |
| duplicate `<file>` entries (warning) | catches copy-paste drift across shards |

> Try it on [`examples/sourcing-app/`](../../examples/sourcing-app/): `--stats` and `--resolve` work
> directly; `--validate` will (correctly!) report the `src/**` paths as missing, because that example ships
> only the genome, not the application source - which is exactly the "moved/missing file" signal the linter
> is built to catch. Run it against a real checkout to see it pass clean.

## CI example (GitHub Actions)

```yaml
name: aigx
on: [push, pull_request]
jobs:
  lint-genome:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.x" }
      - run: python tools/aigx-lint/aigx_lint.py --root .
```

That's the whole answer to "decoupled docs rot": don't decouple *and walk away* - decouple *and lint*.
