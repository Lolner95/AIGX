# AIGX Conformance

Companion to [`AIGX-1.1.md`](AIGX-1.1.md) §13–§15. This document enumerates the conformance requirements,
defines conformance levels, and describes the conformance test suite.

The key words MUST, SHOULD, and MAY are used per [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

---

## 1. Conformance targets

AIGX defines three independent conformance targets. A tool or genome claims conformance to one or more.

| Target | What it is | Requirements |
|---|---|---|
| **Conforming genome** | A `.aigx/` directory that satisfies §6 of the spec | G1–G4 below |
| **Conforming reader** | An agent or tool that acts on a genome | R1–R5 (spec §14) |
| **Conforming writer** | A tool/human that produces a genome | W1–W6 (spec §13) |
| **Conforming validator** | A tool that checks genomes | V1–V7 (spec §15) |

---

## 2. Conforming genome (G1–G4)

A directory is a **conforming AIGX genome** if and only if:

- **G1.** It contains `protocol.aigx`, whose content instructs the reader to consult `files.aigx` per edited
  file and to verify each file's `<check>` ids before finishing.
- **G2.** It contains at least one `<concern>.aigx` with at least one `<rule id="…">` whose id matches
  `PREFIX-[A-Za-z0-9-]+` and is unique within the genome.
- **G3.** It contains `files.aigx` with at least one `<file path="…">` entry.
- **G4.** Every `<check>` id in `files.aigx` resolves to a rule id that exists in a concern file of the
  applicable genome (the genome itself, plus the root genome in a hierarchical layout).

A genome MAY additionally satisfy the RECOMMENDED criteria (a `product.aigx` with `<freshness>`; forbid
scarcity; one gotcha per entry) without affecting whether it conforms — these strengthen a genome but are
not conditions of conformance.

---

## 3. Conformance levels for genomes

Two informative levels help authors describe maturity. They are not gates.

- **Level 1 — Conforming.** Satisfies G1–G4. The genome is valid and an agent can rely on its boundaries.
- **Level 2 — Recommended.** Conforming, **and** every benchmark-backed SHOULD in spec §10.2 holds:
  `product.aigx` with a `<freshness>` clause is present, `<forbid>` density is low, and no entry carries
  more than one `<gotcha>`. The `aigx check-conformance` command reports which level a genome reaches.

---

## 4. The reference validators

Two zero-dependency reference validators ship in the repository and implement V1–V7:

| Tool | Language | Invocation |
|---|---|---|
| `aigx-lint` | Python 3.8+ | `python tools/aigx-lint/aigx_lint.py --root .` |
| `aigx` CLI | Node 18+ | `aigx lint` |

Both check, and fail CI on, the validator errors below.

### 4.1 What a conforming validator checks

| Check | Severity | Spec |
|---|---|---|
| Required files present (`protocol.aigx`, ≥1 concern file, `files.aigx`) | error | V1 |
| Every `<check>` id resolves to a real `<rule id>` | error | V2 |
| Every `<file path>` exists on disk (no stale/renamed/deleted entry) | error | V3 |
| No two `<rule>` elements share an id | error | V4 |
| No duplicate `<file>` entry for the same path | warning | V5 |
| `<forbid>` density is low enough to preserve salience | warning | V6 |
| No unknown `aigx-*` root element | warning | V7 |
| No `path` escapes the repository root | error | security S2 |

### 4.2 Resolution mode

A conforming validator SHOULD provide constant-cost per-file resolution:

```bash
aigx resolve src/features/meetings/bookMeeting.ts
# Applicable genome: .aigx/
# Role:    Book a meeting (validate slot + contact)
# Forbid:  NEVER import @/features/suppliers/internal/*   [CRIT]
# Gotcha:  get contact_email from the suppliers PUBLIC api, never the internal mapper
# Checks:  ARCH-no-deep-imports, DATA-integer-cents, TEST-failing-first
```

---

## 5. The conformance test suite

The suite lives in [`tests/conformance/`](../tests/conformance/) and is run by
[`tests/conformance/run.py`](../tests/conformance/run.py), which drives every available reference validator
(Python, Node, and — if built — Rust) against the fixtures and asserts they all agree, fixture-for-fixture.
Run it with `python tests/conformance/run.py`. The repository's example genomes double as positive fixtures:

| Fixture | Expectation |
|---|---|
| [`examples/minimal/`](../examples/minimal/) | MUST validate clean (Level 1). The smallest G1–G4 genome. |
| [`examples/sourcing-app/`](../examples/sourcing-app/) | MUST validate clean (Level 2). The complete worked example. |

A reimplementation of a validator SHOULD reproduce these results: a clean exit (status 0) on both fixtures,
and a non-zero exit on a fixture mutated to violate any of V1–V4 (delete `protocol.aigx`; add a dangling
`<check>` id; rename an indexed file without updating its `path`; duplicate a rule id).

### 5.1 Negative fixtures

Each lives under [`tests/conformance/invalid/`](../tests/conformance/invalid/), violates exactly one
requirement, and MUST fail on every reference validator:

1. **missing-protocol** — no `protocol.aigx` → fail V1.
2. **dangling-check** — a `<check>` id with no matching rule → fail V2.
3. **stale-path** — a `<file path>` to a deleted file → fail V3.
4. **dup-rule-id** — two rules with the same id → fail V4.
5. **path-escape** — a `<file path="../secret">` → fail security S2.

---

## 6. Claiming conformance

A tool MAY state "AIGX 1.1 conforming reader/writer/validator" if it meets the corresponding requirements.
A genome MAY state "AIGX 1.1 conforming genome" if it meets G1–G4. Conformance claims SHOULD name the
version (`1.1`) and the target. There is no certification authority; conformance is self-asserted and
checkable with the reference validators against the fixtures above.
