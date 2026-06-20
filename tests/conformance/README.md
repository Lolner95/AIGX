# AIGX conformance suite

A fixed set of fixture genomes with known outcomes, driven against **every available reference
validator** to prove they agree. Cross-implementation agreement is the conformance signal: a fixture is
only "settled" when Python, Node, and Rust all reach the same verdict.

See [`standard/conformance.md`](../../standard/conformance.md) for the normative requirements (V1–V7, S2).

## Run

```bash
python tests/conformance/run.py
```

Requires `python` and `node` (the two reference validators). If the Rust binary has been built
(`cargo build --manifest-path crates/aigx/Cargo.toml`), it is included automatically as a third validator.
Exit code is non-zero if any validator disagrees with the expected outcome or with the others.

## Fixtures

**Positive** — MUST validate clean (exit 0):

| Fixture | Notes |
|---|---|
| [`valid/clean/`](valid/clean/) | The smallest self-contained conforming genome. |
| `examples/minimal/` | The repo's minimal example (Level 1). |
| `examples/sourcing-app/` | The complete worked example (Level 2). |

**Negative** — each violates exactly one requirement and MUST fail:

| Fixture | Violates | Rule |
|---|---|---|
| [`invalid/missing-protocol/`](invalid/missing-protocol/) | no `protocol.aigx` | V1 |
| [`invalid/dangling-check/`](invalid/dangling-check/) | `<check>` id resolves to no rule | V2 |
| [`invalid/stale-path/`](invalid/stale-path/) | `<file path>` does not exist on disk | V3 |
| [`invalid/dup-rule-id/`](invalid/dup-rule-id/) | a rule id declared twice | V4 |
| [`invalid/path-escape/`](invalid/path-escape/) | `<file path>` escapes the repo root | S2 |

Each negative fixture is constructed to fail for exactly one reason, so a failing assertion points at a
single requirement. The runner also checks that the failure message names the expected reason.

## Adding a fixture

1. Create a self-contained mini-genome under `valid/` or `invalid/` (its own `.aigx/`, plus any source
   files its `files.aigx` references).
2. Add it to `CASES` in [`run.py`](run.py) with its expected outcome (and, for a negative, a stable
   substring of the error it must produce).
3. Run `python tests/conformance/run.py` — every validator must agree.
