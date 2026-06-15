---
name: New example genome
about: Contribute or request a worked genome for a new language, framework, or architecture
title: "[example] "
labels: example
---

**What stack / language / architecture?**
e.g. Python + FastAPI, Go monorepo, Rails, Next.js, Rust workspace, …

**Why is this example valuable?**
What does it show that the existing TypeScript example doesn't? (import boundaries, language-specific
idioms, monorepo sharding, …)

**Do you have a genome to contribute?**
- [ ] Yes - I'll open a PR with a genome under `examples/<name>/`
- [ ] No - I'm requesting someone build this

**If contributing, does the genome:**
- [ ] Have a `README.md` explaining the codebase it describes
- [ ] Include a `.aigx/` directory with `protocol.aigx`, at least one concern file, and `files.aigx`
- [ ] Pass `aigx-lint --root examples/<name>` (or note why path validation is expected to fail)
