# The Principles - Seven Laws From 600+ Agent Runs

Every principle below is not an opinion - it's a finding from the [benchmark](../BENCHMARK.md), where we
varied one thing at a time and measured the effect on autonomous coding agents (Claude Haiku 4.5 and
Sonnet 4.6). They generalize beyond AIGX: they're useful whenever you write context for an AI agent.

---

### L1 - Short, scarce, direct wins

Anything that **lengthens, dilutes, repositions, or re-frames** a signal tends to *reduce* compliance. A
boundary stated in five words ("NEVER import internal/*") outperforms the same boundary wrapped in
explanation. Across ~24 challenger variants, the ones that added words lost.

> **Apply it:** write the shortest rule that is still unambiguous. Resist the urge to explain.

---

### L2 - Per-file *addressability* beats both global prose and in-source inlining

This is the law most often misread, so state it precisely. We tested **three** placements of the same
rule: (a) a global prose doc, far from the edit; (b) **inline in the source file** (true physical
colocation); (c) a **per-file index** - central, but *addressed to the file being edited*. Result: **(b)
inline lost** (parse-noise, especially on strong models), **(c) the addressed index won**, and (a) lacked
targeting. Document *position* within a file (top/bottom/sorted, "Lost-in-the-Middle" tricks) did **not**
matter - a selective reader never scans top-to-bottom.

So the winning property is **not** "put the rule physically next to the code." It is: **make the rule
*retrievable per edit-target*, while keeping it *out of* the source.** (This is *expression locality*, in
the genome sense: a gene isn't copied into every cell - it lives centrally and is *expressed* where
relevant. The per-file index is that expression map.)

> **Apply it:** invest in *per-file addressing* (AIGX's index) - not in document ordering, not in
> repetition, and not in inlining context into your source files.

---

### L3 - Simpler wins

Every embellishment we layered on top of the lean design - routing tables, worked examples, salience
tiers, self-audit scaffolds, inverted indexes - either **hurt or washed out.** The simplest design (lean
per-file index + concern files, nothing injected) was never beaten.

> **Apply it:** complexity must *prove* it helps. Default to less structure.

---

### L4 - `n=30` rankings are noise

We watched a challenger post a perfect "0% architecture violations" at n=30 and then regress to ~5-8% at
n=60 - **four separate times.** Small-sample leaders are usually lucky draws. The discipline: *double the
sample before you believe a winner.*

> **Apply it:** if you A/B your own prompts/context, don't trust a 20-or-30-run result. Power it up.

---

### L5 - Winning levers don't stack

We found two changes that each *nominally* helped, combined them, and got **less than either alone.** Two
good ideas on disjoint surfaces acted as *substitutes*, not complements - likely because each was already
capturing most of the available signal.

> **Apply it:** don't assume improvements are additive. Measure the combination; it may be worse.

---

### L6 - Format effects are model-dependent and don't shrink with capability

The gap between the best and worst format **grew** from the weaker model to the stronger one. And the
*ranking* changed: pure prose was the worst for discipline on the weak model and the *best* on the strong
one, while rigid XML did the reverse. A more capable model does **not** make context format less
important - if anything, more.

> **Apply it:** don't assume "the model is smart enough, format doesn't matter." Test on your actual model.
> A robust format (per-file directives at the edit site) survives this swing; brittle ones don't.

---

### L7 - The residual is model capability, not format

Past a certain quality of context, the remaining errors are **hard-task difficulty**, not bad docs. Some
tasks defeated even gold-standard reference patches on the weaker model regardless of format. Context
engineering has a ceiling; beyond it, you need a better model or an easier task - not a better document.

> **Apply it:** know when you've hit the format ceiling, so you stop polishing docs and change the model
> or decompose the task.

---

## The synthesis (which *is* AIGX)

Put the seven together and you get the winning design directly:

- **L1 + L3** → terse rules, lean index, nothing extra.
- **L2** → a **per-file boundary index** so the constraint is at the edit site.
- **L6** → **directives at the edit site** (robust across models) rather than brittle global tags.
- centralized (not in-source), because copying instructions everywhere violates L1 and L3.

That's `aigx_terse`. The format is the principles, made concrete.
