# The AIGX Benchmark - Methodology, Results, and Honest Caveats

> **The claim:** with a codebase's rules held *identical* and only the **context format** changing, AIGX
> produces the most correct and most disciplined AI-agent output - and it is the only context format we
> are aware of that has been validated this way.

This document is the evidence. It is deliberately complete, including the places where the result is
*nuanced rather than triumphant*, because a benchmark you can't trust is worse than no benchmark.

---

## 1. What was measured

A **controlled ablation.** A single real TypeScript codebase ("SourcingGPT", an expo-sourcing app for
Brazil/Mexico electronics trade shows, ~35 source files) is held **constant**. The *only* variable is how
the project's rules are written down. Every format encodes the **identical** rule set; semantic parity is
machine-checked (every rule-id and every domain-fact substring must appear in every variant's corpus).

**Formats compared:** Markdown, Cursor-style MDC rules, YAML, XML, five in-source/sidecar "EXIFAI"
variants, and the AIGX family - 18+ distinct encodings of the same rules.

**Subject models (autonomous agents - they grep, read, edit, run `npm test` / `tsc`):**
- **Claude Haiku 4.5** (weaker tier)
- **Claude Sonnet 4.6** (stronger tier)
- **Gemini** (single-shot full-rewrite mode, earlier phase)

**The traps (why it discriminates).** The codebase contains planted pitfalls a careless edit hits:
deep-import boundary violations, dependency cycles, cross-event data leaks (ids repeat across events),
cache-header middleware ordering, AI hallucination from marketing copy, bundle-budget regressions,
stale-doc conflicts, plus 10 hard-correctness traps: TOCTOU double-booking, floating-point money, DST
time-zone conversion, Unicode folding, cursor pagination, idempotency, IDOR authorization, ReDoS,
illegal state transitions, and unbounded caches.

---

## 2. How it was scored (deterministic & tamper-proof)

Each run is scored by machine, not by an LLM judge, with a tamper-proof pipeline:

1. **Visible oracle tests** - the task's acceptance tests.
2. **Hidden tests** - injected after the agent finishes, run, then removed. The agent never sees them, so
   it cannot teach to the test. *This is the primary correctness signal.*
3. **Architecture-violation check** - a pristine diff vs the seed detects forbidden imports / cycles.
4. **`tsc --noEmit`**, a **gzip bundle-budget gate**, and rubric probes.
5. Baseline (regression) tests are **restored to pristine before scoring** so legitimate test *additions*
   are never mis-penalized.

Final score (0-100) is weighted: visible 20 / hidden 30 / architecture 20 / obedience 15 / perf-security
10 / minimality 5.

---

## 3. Headline results (authoritative, powered to n=60)

Mean final-score on the discriminating "original-10" suite. "arch-viol" = % of runs that crossed a
forbidden import boundary (lower is better).

### Claude Sonnet 4.6

| Format | mean | pass@1 | hidden | arch-viol |
|---|:---:|:---:|:---:|:---:|
| **🧬 AIGX (terse)** | **95.4** | **0.92** | **98.6%** | 8% |
| Markdown | 95.1 | 0.80 | 96.4% | **0%** |
| EXIFAI v2 (in-source) | 94.6 | 0.80 | 96.1% | 3% |
| AIGX + in-source guards | 93.6 | 0.77 | 94.3% | 10% |
| XML | 93.1 | 0.80 | 93.8% | 13% |

### Claude Haiku 4.5

| Format | mean | pass@1 | hidden | arch-viol |
|---|:---:|:---:|:---:|:---:|
| **🧬 AIGX (terse)** | **93.5** | **0.78** | **96.0%** | 7% |
| AIGX + in-source guards | 92.8 | 0.70 | 92.6% | 5% |
| EXIFAI v2 | 92.4 | 0.67 | 90.2% | 0% |
| XML | 92.3 | 0.75 | 93.3% | 8% |
| Markdown | 92.2 | 0.70 | 93.6% | 10% |

**AIGX ranks nominally first on mean, pass@1, and hidden-test pass on both models - but read this with
§5 and §7.** At n=60 the top cluster (AIGX, Markdown, EXIFAI-v2) is a **statistical tie on the mean**; we
do **not** claim a significant margin. What *is* distinctive is **cross-tier consistency**: AIGX is the
**only** format first on *both* models. Markdown is excellent on Sonnet (95.1) but near-last on Haiku
(92.2); XML is roughly the reverse. A format that wins one tier and falls on the other is a liability when
you switch models; AIGX is the one that holds.

### Single-shot (Gemini, earlier phase)
In single-shot full-rewrite mode, centralized AIGX beat XML **80.8 vs 74.9 (+5.9)**; pure-prose Markdown
led that mode (84.0). Takeaway: AIGX is the best *structured* format across interaction modes; prose only
edges it in the non-agentic full-rewrite case. (Re-running the latest variants on Gemini is an open thread.)

---

## 4. Cross-model findings (from the same runs)

- **Format choice does NOT matter less on a smarter model.** The spread between formats *grew* from Haiku
  to Sonnet (≈1.4 → ≈2.1 points). Better models don't make context format irrelevant.
- **Markdown and XML *swap* discipline ranks between tiers.** On Sonnet, Markdown hits 0% arch-violations
  (best) while rigid XML hits 13% (worst); on Haiku the order roughly reverses. A strong model internalizes
  prose and rationalizes around rigid tags; a weak model needs the rigid scaffold. AIGX's per-file
  *directive at the edit site* is robust to this because it isn't a distant declarative tag.
- **In-source guards help neither tier and hurt the strong model.** Adding one-line `// NEVER import X`
  comments to source was neutral on Haiku and *cost* Sonnet −1.6 mean / −4pt hidden. Centralized wins.

---

## 5. Why n=60? (the variance story) {#why-n60}

This is the most important methodological lesson, and it's why we trust the AIGX result.

**`n=30` rankings are noise.** Repeatedly across this study, a challenger posted a perfect-looking
headline at n=30 - e.g. "0% architecture violations" - and then **collapsed when powered to n=60.** The
"0%" was a lucky draw of 0/30; at 60 runs the true rate (≈5-8%) showed up. We caught this **four separate
times**. The discipline rule that emerged: *never believe a leader until you double the sample.* Every
AIGX headline in §3 is at **n=60**.

---

## 6. The challenger log - we tried hard to beat AIGX and failed

After AIGX won the format comparison, we ran a deliberate campaign to beat the winning `aigx_terse`
design. **~24 challenger variants across 6 research rounds. Every one tied or lost.**

| Round | Challengers (mechanism) | Result |
|---|---|---|
| In-source guards | one-line `NEVER import X` on the import-sensitive files; then on all trap files | tie on Haiku; **lost** on Sonnet; "0%" was an n=30 mirage |
| Positional | restate critical rules at top+bottom (primacy/recency); severity-sorted index | lost - *position* is a weak lever for a selective reader |
| Salience | demote routine gotchas; 3-tier CRIT/HIGH/NORM ladder | lost - uniform `CRIT` is best; grading reduced compliance |
| Framing | pair "NEVER X" with positive "DO Y"; senior-engineer priming line | lost - lengthening reduced punch |
| Prose register (round 1, 10 variants) | prose index, check-id gloss, routing map, prose rules, kv-compression, inverted index, domain grouping, self-audit step | **all tied** terse |
| Combinations (round 2, 8 variants) | stack the two best ideas; full-prose; gloss form/length/scope | **all tied**; *winning levers don't stack*; longer glosses *hurt* |
| **n=60 capstone** | the two best nominal challengers, powered | **both collapsed to a tie**, both *below* terse on hidden + pass@1 |

This is the strongest part of the result: AIGX isn't a lucky point estimate. It's a **robust local
optimum** - the design that *kept winning* under sustained, theory-driven attack on two different models.

---

## 7. The honest caveats (read these)

- **At matched power, the *top* formats are close.** AIGX, XML, EXIFAI-v2, and Markdown form a tight
  cluster (~92-95, overlapping confidence intervals on mean). AIGX is not a 20-point blowout over good
  alternatives. Its win is **#1-on-every-metric-on-both-models + survived-every-challenger + simplest to
  author** - robustness and generalization, not margin.
- **One codebase, one task family.** The absolute numbers are specific to this app and its traps.
- **Two models + one single-shot model.** Broad for a study of this kind, not universal.
- **The residual is model capability.** The gap to a perfect score is dominated by genuinely hard tasks
  (some defeat even gold-standard patches on the weak model), not by context format. Past a point, better
  docs cannot fix harder problems.

We state these because a context format that *helps* should be adopted for the right reasons. AIGX earns
adoption on robustness, per-file precision, clean source, and the fact that it's the only option here
that was *measured at all.*

> **A point reviewers raise: "won't bigger models / bigger context windows make this obsolete?"** Our data
> says the opposite. Format spread *grew* from Haiku to Sonnet - the stronger model was *more*
> format-sensitive - and larger context windows make "lost-in-the-middle" selective reading *worse*, which
> raises the value of putting the constraint at the edit site. See the full treatment, plus responses to
> the monorepo-scale, developer-experience, and "statistical-tie" objections, in
> **[docs/limitations.md](docs/limitations.md)**.

---

## 8. Reproducibility

The benchmark harness is a generator + materializer + runner + deterministic scorer. Key properties for
reproduction:

- One canonical knowledge base generates every format's files, so **parity is guaranteed by construction**
  and then re-checked.
- Each run is an isolated workspace (seed code + one format's context + the task + hidden oracle).
- Scoring is fully deterministic (no LLM judge in the score).
- Results are powered to **n=60** for every headline; challengers are screened at n=30 then powered.

If you want to reproduce or extend the study (more languages, more models, your own codebase), open an
issue - we're glad to help and would love independent replication.

---

*The format this benchmark validated is specified in [SPEC.md](SPEC.md); the design principles it
revealed are in [docs/principles.md](docs/principles.md).*
