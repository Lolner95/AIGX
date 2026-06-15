# Example genome - "SourcingGPT"

This is a **complete, real-world AIGX genome** for a non-trivial TypeScript application: SourcingGPT, an
expo-sourcing app for Brazil/Mexico electronics trade shows (~35 source files). It is the exact genome used
as the canonical winner in the [benchmark](../../BENCHMARK.md).

Use it as a reference while you write your own (see the [authoring guide](../../docs/authoring-guide.md)).

## What's here

```text
sourcing-app/
├── .aigx/
│   ├── protocol.aigx        # the read protocol
│   ├── product.aigx         # product context + a freshness clause that supersedes old docs
│   ├── architecture.aigx    ┐
│   ├── data.aigx            │
│   ├── auth.aigx            │
│   ├── caching.aigx         │  nine per-concern rule files
│   ├── performance.aigx     │  (full <rule id="…"> text)
│   ├── testing.aigx         │
│   ├── ai.aigx              │
│   ├── offline.aigx         │
│   ├── engineering.aigx     ┘  (10 hard-correctness invariants: TOCTOU, money, DST, ReDoS, IDOR, …)
│   └── files.aigx           # ★ the per-file boundary index - 35 entries
└── src/…/<domain>.aigx      # 12 per-domain cards, colocated with the (illustrative) source folders
```

> Note: the `src/` tree here contains only the `<domain>.aigx` cards (to show *placement*); the actual
> application source isn't included - the genome is the point.

## Things worth noticing

- **Scarcity of `<forbid>`.** Of 35 files in `files.aigx`, only **4** carry a `<forbid>` - the ones with a
  real import boundary (the suppliers barrel, the internal contact mapper, `bookMeeting`, `SupplierCard`).
  That scarcity is deliberate and is what makes the signal land.
- **One gotcha per file.** Each entry names the single worst pitfall, not a list.
- **`<check>` ids resolve.** Every id in a `<check>` (e.g. `ARCH-2`, `ENG-1`) is a real `<rule>` in a
  concern file - the cross-reference backbone.
- **A freshness clause.** `product.aigx` explicitly supersedes `docs/LEGACY_README.md`, which prevents the
  agent from following stale guidance (several traps in the benchmark exploited exactly this).
- **Nothing in the source.** No comments, no headers - the genome is entirely in `.aigx/` and the cards.

Open [`.aigx/files.aigx`](.aigx/files.aigx) first - it's the keystone and the clearest illustration of what
AIGX adds over a flat rules file.

## Validating this example

```bash
# From the repo root:
python tools/aigx-lint/aigx_lint.py --stats --root examples/sourcing-app
```

This prints genomes, rule count, entry count, and forbid scarcity. `--validate` will report the `src/**`
paths as missing (expected - only the genome ships, not the app source). Against a real checkout it
would pass clean.

To look up one file's boundary entry:

```bash
python tools/aigx-lint/aigx_lint.py --resolve src/features/meetings/bookMeeting.ts \
  --root examples/sourcing-app
```

## How to read it as a learning exercise

1. Open `.aigx/files.aigx` - skim all 35 entries. Notice: only 4 have `<forbid>`, each is one line.
2. Open `.aigx/engineering.aigx` - these are the 10 hard-correctness invariants (TOCTOU, money, DST,
   ReDoS, IDOR, …). See how ENG-1 through ENG-10 are referenced in `<check>` lists across `files.aigx`.
3. Open any `src/<feature>/<domain>.aigx` card - this is a per-domain card showing placement and content.
4. Read the [authoring guide](../../docs/authoring-guide.md) alongside to understand the decisions.
