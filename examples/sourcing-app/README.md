# Example genome — "SourcingGPT"

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
│   └── files.aigx           # ★ the per-file boundary index — 35 entries
└── src/…/<domain>.aigx      # 12 per-domain cards, colocated with the (illustrative) source folders
```

> Note: the `src/` tree here contains only the `<domain>.aigx` cards (to show *placement*); the actual
> application source isn't included — the genome is the point.

## Things worth noticing

- **Scarcity of `<forbid>`.** Of 35 files in `files.aigx`, only **4** carry a `<forbid>` — the ones with a
  real import boundary (the suppliers barrel, the internal contact mapper, `bookMeeting`, `SupplierCard`).
  That scarcity is deliberate and is what makes the signal land.
- **One gotcha per file.** Each entry names the single worst pitfall, not a list.
- **`<check>` ids resolve.** Every id in a `<check>` (e.g. `ARCH-2`, `ENG-1`) is a real `<rule>` in a
  concern file — the cross-reference backbone.
- **A freshness clause.** `product.aigx` explicitly supersedes `docs/LEGACY_README.md`, which prevents the
  agent from following stale guidance (several traps in the benchmark exploited exactly this).
- **Nothing in the source.** No comments, no headers — the genome is entirely in `.aigx/` and the cards.

Open [`.aigx/files.aigx`](.aigx/files.aigx) first — it's the keystone and the clearest illustration of what
AIGX adds over a flat rules file.
