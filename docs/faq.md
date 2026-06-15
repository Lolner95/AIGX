# Frequently Asked Questions

### What is AIGX?
AIGX (AI Genome Exchange) is an open, MIT-licensed **context format for AI coding agents**. It stores a
codebase's rules in a centralized `.aigx/` directory and adds a **per-file boundary index** - for each
source file, the exact rules, forbidden imports, and gotchas that apply *there*. It is, to our knowledge,
the only context format validated to win a controlled benchmark.

### What problem does it solve?
AI coding agents read context selectively, at the file they're editing. A long `CLAUDE.md`/`AGENTS.md`
buries the one rule that matters for *this* file. AIGX puts that rule one lookup away (in `files.aigx`), so
the agent gets the binding constraint at the edit site - which is what drives correct, in-bounds edits.

### How is AIGX different from AGENTS.md or CLAUDE.md?
`AGENTS.md`/`CLAUDE.md` are typically a single flat prose file with at most coarse path scoping. AIGX adds
a structured **per-file boundary index** and stable rule-ids, so context is *targeted* rather than global,
and it's tool-agnostic. You can author AIGX once and export down to `AGENTS.md`/`CLAUDE.md`. Think of AIGX
as the richer substrate; the flat files as one possible output.

### Is AIGX meant to replace AGENTS.md?
No. `AGENTS.md` is a great, widely-supported convention. AIGX is the **genome layer** beneath it - more
precise (per-file), measured (benchmark-validated), and exportable to the flat formats your tools already
read. Use them together.

### Does it work with Claude Code, Cursor, Copilot, and Aider?
Yes. AIGX is plain text in a `.aigx/` directory; you make any agent AIGX-aware with one instruction line
(the [agent addendum](../SPEC.md#agent-addendum)) added to its existing config. No plugin required.

### Does AIGX put comments or headers in my source code?
No, deliberately. We measured that in-source comments/headers *hurt* a strong model (added parse-noise)
and clutter diffs. The genome lives entirely in `.aigx/`; your code stays clean.

### What does the benchmark actually prove?
That with the rules held identical and only the **format** changing, AIGX produced the most correct
(highest hidden-test pass rate) and most disciplined agent output - **#1 on mean, pass@1, and hidden-test
pass on both Claude Haiku 4.5 and Claude Sonnet 4.6 at n=60** - and that this survived ~24 deliberate
attempts to beat it. Full method: [BENCHMARK.md](../BENCHMARK.md).

### Is AIGX dramatically better, or are the top formats close?
Honestly: the *top* formats are a close cluster at matched power. AIGX's edge is **robustness,
cross-model generalization, and simplicity** - it leads on every primary metric on *both* models and is
the design that kept winning when challenged. That's more valuable than a fragile blowout. We document
this nuance openly in the benchmark.

### Why is it called a "genome"?
A genome is the central, portable instruction set that builds and operates an organism - consulted by each
cell, not copied into it, with only the locally-relevant genes *expressed*. AIGX is that for your
codebase: central rules in `.aigx/`, a per-file index that "expresses" the right rules at each file, and
source code left untouched. [More on the concept →](concept.md)

### What languages / stacks does it support?
Any. The format is language-agnostic plain text. The worked example happens to be TypeScript, but the
genome describes *rules and boundaries*, which exist in every language. Python/Go/monorepo examples are on
the roadmap.

### How big should `files.aigx` be?
One entry per file an agent realistically edits - not every file in the repo. Keep `<forbid>` rare (only
real import boundaries) and one `<gotcha>` per entry. Lean indexes outperformed rich ones in testing.

### Can I use it commercially? Can I build tools on it?
Yes. It's **MIT**. Use it, fork it, sell products built on it - no permission needed. AIGX is meant to be a
shared standard.

### How do I contribute or propose a change to the spec?
See [CONTRIBUTING.md](../CONTRIBUTING.md). Spec changes, exporters, linters, and new-language examples are
all welcome. Independent replication of the benchmark is especially welcome.

### Where do I start?
The [Quick start](../README.md#quick-start-under-60-seconds) (copy the starter, fill in `files.aigx`, add
one line to your agent config), then the [authoring guide](authoring-guide.md).

### How do I migrate from an existing CLAUDE.md or AGENTS.md?
Keep your existing file - it still works. Add a `.aigx/` directory alongside it and point agents at both.
The quickest migration: paste your most critical rules into `.aigx/architecture.aigx` as `<rule id="…">`
entries, then build `files.aigx` one file at a time as you touch code. See
[docs/migration.md](migration.md) for a step-by-step guide.

### What happens if I rename a file that has an entry in `files.aigx`?
The entry's `path` will no longer exist on disk, and `aigx-lint --root .` will fail. That's intentional:
the lint failure tells you *exactly* which entry to update. Wire `aigx-lint` into your CI or a pre-commit
hook so the mismatch is caught immediately rather than silently rotting.

### Can I run `aigx-lint` in GitHub Actions?
Yes - it's a single zero-dependency Python script. See the CI snippet in the
[aigx-lint README](../tools/aigx-lint/README.md). It also works in GitLab CI, Bitbucket Pipelines, and
any environment with Python 3.8+.
