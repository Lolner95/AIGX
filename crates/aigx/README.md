# aigx (Rust)

The Rust reference implementation of the **AIGX (AI Genome Exchange)** CLI — a zero-dependency
(std-only) validator, resolver, and scaffolder for a codebase's AI-agent genome.

AIGX stores a codebase's AI-agent rules and per-file boundaries in a centralized `.aigx/` directory,
injecting nothing into source code. See the normative spec:
<https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.md>.

This crate is one of **three reference validators** (alongside the Node `aigx` CLI / `@aigx/lint` and the
Python `aigx-lint`). All three are held to agree, fixture-for-fixture, by the
[conformance suite](https://github.com/Lolner95/AIGX/tree/main/tests/conformance).

## Install

```bash
cargo install aigx
```

## Usage

```bash
aigx lint                       # validate the genome(s) under the current directory (exit !=0 on errors)
aigx lint --root . --json       # machine-readable result
aigx resolve src/foo.ts         # print one file's boundary (role, forbid, gotcha, checks) — O(1)
aigx init                       # scaffold a minimal .aigx/ genome
aigx --version
```

`aigx lint` checks: required files exist · every `<check>` id resolves · every `<file path>` exists ·
no duplicate rule ids · no path escapes the repository root. It honors `.aigxignore` and `--exclude DIR`.

## Conformance

This binary implements the validator requirements **V1–V7** and security rule **S2** of AIGX 1.1
(see [`standard/conformance.md`](https://github.com/Lolner95/AIGX/blob/main/standard/conformance.md)).

## License

MIT. The AIGX specification text is licensed CC-BY-4.0; the tools (including this crate) are MIT.
