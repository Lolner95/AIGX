# Contributing to AIGX

Thanks for your interest - AIGX is meant to be a shared standard, and it gets better with more eyes,
more languages, and independent replication.

## Ways to contribute

- **Spec feedback.** Found an ambiguity in [SPEC.md](SPEC.md)? Open an issue. Concrete wording proposals
  (PRs against the spec) are very welcome.
- **New worked examples.** A genome for a Python / Go / Rust / monorepo project is hugely valuable. Add it
  under `examples/<name>/` with a short README explaining the codebase it describes.
- **Tooling.** Exporters (`aigx → AGENTS.md / CLAUDE.md / .cursor/rules`), a linter (`aigx-lint`: validate
  parity, dangling `<check>` ids, missing entries), editor integrations.
- **Replication.** The strongest contribution of all: reproduce the [benchmark](BENCHMARK.md) on your own
  codebase / model and report what you find - confirming *or* challenging the result. Open an issue with
  your setup and numbers.
- **Docs.** Clarity fixes, typos, better diagrams.

## Principles for proposals

AIGX is an *empirical* project. The bar for adding complexity to the format is high, because the
[benchmark](BENCHMARK.md) repeatedly showed that **embellishments don't help** (see
[principles](docs/principles.md)). If you propose a new field, mechanism, or structure:

1. State the failure mode it fixes.
2. Prefer the simplest version.
3. Ideally, bring evidence (even a small A/B on your own repo) that it changes agent behavior. Remember
   L4: `n=30` is noise - power it up before trusting it.

"It feels more complete" is not, by itself, a reason - completeness lost to terseness every time we tested.

## Workflow

1. Open an issue to discuss anything non-trivial before a big PR.
2. Fork, branch, commit with clear messages.
3. Keep PRs focused (one idea per PR).
4. For spec changes, update `SPEC.md` and bump the version note if it's normative.
5. Be excellent to each other - see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

By contributing, you agree your contributions are licensed under the [MIT License](LICENSE).
