# Minimal AIGX Example

The smallest valid AIGX genome: 3 files, one rule, one file entry.

Use this as a reference when starting from scratch or to check that a tool correctly parses the format.
For a realistic, complete genome see [`examples/sourcing-app/`](../sourcing-app/).

## What's here

```
.aigx/
├── protocol.aigx      # read protocol (required)
├── architecture.aigx  # one rule: ARCH-1
└── files.aigx         # one file entry with forbid + check
```

## Conformance

This genome conforms to AIGX v1.1:

- `protocol.aigx` instructs per-file index lookup and `<check>` verification.
- `architecture.aigx` has one `<rule id="ARCH-1">`.
- `files.aigx` has one `<file>` entry whose `<check>ARCH-1</check>` resolves to a real rule.

Run `aigx-lint`:

```bash
python tools/aigx-lint/aigx_lint.py --stats --root examples/minimal
# Note: --validate will report src/core/service.ts as missing (it's a placeholder path).
# That's expected - the example ships only the genome, not the application source.
```
