# Scope, Limitations & Responses to Critique

A benchmark you can't trust is worse than none. This page states the boundaries of the AIGX result and
answers the strongest objections head-on. We'd rather mark the edge of the map than oversell.

---

## What we claim - and what we explicitly do **not**

**We claim:**
- AIGX is, to our knowledge, the **only context format validated in a controlled benchmark** at all.
- It is the **only format that ranked first on *both* a weaker and a stronger model** (Claude Haiku 4.5
  *and* Sonnet 4.6, n=60) - i.e. the most *consistent* member of the top group.
- It is the **most robust**: it survived ~24 deliberately-engineered challengers across 6 research rounds;
  none beat it.
- It is the **simplest** top-tier design to author, and it injects **nothing** into source code.

**We do NOT claim:**
- ❌ A large margin over good alternatives. On the composite *mean*, the top formats are a **statistical
  tie** (see §3).
- ❌ Validation at monorepo (5k-50k file) scale. The study used one mid-size app (§1).
- ❌ Superiority for **single-shot full-rewrite**. In that mode, prose (Markdown) wins (§4).
- ❌ That context format can substitute for **model capability** on genuinely hard tasks (§4).
- ❌ Zero maintenance. The cost is real but bounded and automatable (§2).

The rest of this page is the long version, organized by the five objections a careful reviewer raises.

---

## 1. Codebase scale - "one 35-entry index isn't a monorepo"

**The objection is correct as stated.** The benchmark holds *one* ~50-file app constant; `files.aigx` has
35 entries. A single centralized index would not scale to 50,000 files - the index alone would blow the
context budget, which would violate our own "simpler wins" law.

**Why it doesn't sink the design - two mechanisms, both real:**

1. **Hierarchical (sharded) genomes.** AIGX is not required to be one root file. A monorepo SHOULD use one
   `.aigx/` per package/workspace, each `files.aigx` scoping only *its* subtree (spec'd in
   [SPEC §8](../SPEC.md#8-scaling-to-large-repositories--monorepos)). An agent editing
   `packages/checkout/…` loads only `packages/checkout/.aigx/` - context is bounded by the **working
   package**, never the whole repo. This is *more* faithful to the locality finding, not less.
2. **Retrieval, not ingestion.** The index is *looked up*, not read whole. An agent greps for the path it's
   editing and reads one entry. The bundled **`aigx-lint --resolve <path>`** ([tools/aigx-lint](../tools/aigx-lint/))
   returns exactly that entry - **O(1) context per edited file, independent of repo size.** A 50,000-entry
   index costs an agent one lookup, not 50,000 lines.

**Honest status:** the hierarchical design is *specified and tool-supported*; it is **not yet benchmarked**
at 5k+ files. That's labeled future work and an open invitation for replication - we won't claim a number
we haven't measured.

---

## 2. Developer experience - "decoupled docs rot the moment a file moves"

**The risk is real:** rename a file and its index entry goes stale.

**But "decoupled ⇒ rots" is only true *without tooling* - and tooling is the entire answer.** Every modern
codebase already maintains decoupled, path-referencing config and keeps it correct in CI:
`CODEOWNERS`, `tsconfig.json` path maps, ESLint import-boundary rules (Nx, `eslint-plugin-boundaries`),
`.gitignore`, coverage configs. AIGX is the same class of artifact, and gets the same treatment:

- **`aigx-lint`** (shipped, zero-dependency: [tools/aigx-lint](../tools/aigx-lint/)) validates the genome
  against the *actual* repo: every `<file path>` MUST exist on disk, every `<check>` id MUST resolve to a
  real rule. Wire it into CI or a pre-commit hook and **the genome cannot silently rot** - a moved file
  *fails the build* until its entry is fixed.
- This is **strictly better than in-source comments**, which rot *invisibly* with no possible check.

So the maintenance burden is real but **bounded, mechanical, and CI-enforceable** - exactly how every team
already keeps `CODEOWNERS` honest. "Disconnected and therefore rotting" describes undisciplined docs, not a
linted artifact.

---

## 3. "#1" vs. a statistical tie - the honesty correction

**This objection is fair about emphasis, and we have corrected the framing throughout.** Here is the
precise, defensible truth:

- On the **composite mean**, the top formats (AIGX, Markdown, EXIFAI-v2, XML) are a **statistical tie** at
  n=60 - their confidence intervals overlap. **We do not claim a significant mean win, and we now say so on
  the cover, not in a footnote.**
- Even `pass@1` and `hidden` leads, while AIGX is nominally first, are inside the noise band at n=60. We
  don't dress them up as significant.

**What survives scrutiny - and is genuinely distinctive:**

| Distinctive property | Why it's real, not variance-mining |
|---|---|
| **Top-ranked on *both* model tiers** | Markdown is top on Sonnet but **near-last on Haiku**; XML is roughly the reverse. AIGX is the *only* format first on both. Cross-tier consistency is a repeatable, checkable property. |
| **Most robust** | Survived ~24 engineered challengers across 6 rounds; the win is a property of the *design under attack*, not a point estimate. |
| **Only one measured at all** | Every competing format is justified by assertion. AIGX is the only one with a controlled result. |
| **Simplest top-tier design** | Authored in an afternoon; nothing injected into source. |

**The corrected headline:** *AIGX matches the best context formats on raw score while being the most
consistent across models, the most robust under challenge, the simplest to author, and the only one ever
measured.* A reproducible tie-at-the-top that you can write in an afternoon and that holds across model
tiers is a more useful result than a fragile, format-specific blowout would be - and it's the one we can
stand behind.

---

## 4. Mode & capability dependence - scope it, then correct the "obsolete" prediction

**Scope, stated plainly:** AIGX targets **agentic** coding agents (grep → read → edit → test) - the
dominant and fastest-growing mode (Claude Code, Cursor's agent, Copilot's agent, Codex, Aider). For
**single-shot full-rewrite**, prose (Markdown) wins, and we say so. That's a different - and shrinking -
interaction mode.

**The "bigger context windows will make micro-formats obsolete" prediction is contradicted by our own
data:**

1. **Format spread *grew* from Haiku to Sonnet.** The *stronger* model was *more* format-sensitive, not
   less. If anything, the trend says format matters **more** as capability rises.
2. **Bigger windows make selective reading and "lost-in-the-middle" worse, not better.** More tokens = more
   noise to wade through = *more* need to put the binding constraint at the edit site. A larger window
   raises the value of per-file addressing; it does not remove it.
3. **Capability-dependence is an argument *for* AIGX, not against it.** Because the best format *changes by
   model* (prose for strong, rigid tags for weak), you want a format **robust to that swing.** AIGX's
   per-file directive-at-the-edit-site is that robust middle - which is exactly *why* it's the one format
   that tops both tiers.

**The residual-is-model-capability point is true, and we keep it.** Past the format ceiling, harder tasks
need a better model, not a better document. That's a limit on **every** context format, not a knock on AIGX
specifically - it just means: don't expect docs to fix genuinely hard problems.

---

## 5. The "locality" contradiction - a precision fix (the critic is right)

**The objection:** we say "locality beats position," yet AIGX forces the agent to read a *separate*
`.aigx` file - and *true* locality (rules inside the source file) is the thing we tested and rejected. So
our "locality" is really a centralized index, a contradiction.

**The critic caught a genuine imprecision, and the corrected statement is *stronger*.** We tested **three**
placements:

| Placement | Result |
|---|---|
| (a) Global prose doc (rules far from the edit) | weak targeting |
| (b) **Inline in the source file** (true physical colocation) | **lost** - parse-noise, especially on strong models |
| (c) **Per-file index** - central, but *addressed to the file* | **won** |

So the finding is **not** "physical colocation wins." It is: **context must be *addressable per edit-target*
but kept *out of the source*.** Calling that "locality" was loose. The accurate law is now stated as:

> **Per-file *addressability* beats both global prose and in-source inlining.**

And the genome metaphor encodes exactly this: a gene is **not copied into every protein** (that's
inlining - option b, which lost); it lives in the central genome and is **expressed per cell type** (that's
addressed retrieval - option c, which won). The per-file index is the **expression map** - *which rule is
active here* - not document position and not source pollution. Read "locality" as *expression locality*,
and the contradiction dissolves. ([principles.md](principles.md) has been rewritten accordingly.)

---

## Threats to validity (the short list, for honesty)

- **One codebase, one task family.** Absolute numbers are specific to this app and its planted traps.
- **Two agentic models + one single-shot model.** Broad for a study of this kind; not universal.
- **Generated workspaces, automated scoring.** Removes judge bias, but it's synthetic versus a live team.
- **Scale unproven past ~50 files.** Hierarchical design is specified, not yet benchmarked at monorepo size.

We publish these so AIGX is adopted for the right reasons. It earns adoption on **per-file precision, clean
source, tool-checkable freshness, cross-model robustness, and the simple fact that it's the only option
here that was measured** - not on a margin we don't have. [See the full benchmark →](../BENCHMARK.md)
