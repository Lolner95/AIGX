# aigx-sync

A tiny, zero-dependency Python script that **automatically patches `files.aigx` when source files are
renamed or moved**. Install it as a git pre-commit hook and index drift becomes physically impossible -
the genome updates itself in the same commit as the rename.

## The problem it solves

AIGX's `files.aigx` references source files by path. If a developer renames
`src/features/meetings/bookMeeting.ts` to `scheduleMeeting.ts`, the index entry goes stale. Without
tooling this either breaks CI (if `aigx-lint` is wired) or silently rots. Neither is good DX.

`aigx-sync` fixes it at the source: the pre-commit hook runs before the commit lands, rewrites the
stale path, and stages the fix alongside the rename — so the commit that renames the file also corrects
the genome, atomically, without the developer having to think about it.

## Install (one-time, per repo)

```bash
# Copy the hook
cp tools/aigx-sync/aigx_sync.py .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Or, if you use the [`pre-commit`](https://pre-commit.com) framework:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: aigx-sync
        name: Auto-patch aigx genome on file renames
        entry: python tools/aigx-sync/aigx_sync.py --root .
        language: python
        pass_filenames: false
        always_run: true
```

## Usage

```bash
# Run manually (e.g. to preview what would change)
python tools/aigx-sync/aigx_sync.py --dry-run --verbose

# Run against a different root
python tools/aigx-sync/aigx_sync.py --root /path/to/repo
```

## What it patches

For every rename in the staged index (`git diff --staged --diff-filter=R`), it rewrites the matching
`path="..."` attribute in every `files.aigx` found under the repository root, then re-stages the modified
`files.aigx` automatically.

```
# Before rename staged:
<file path="src/features/meetings/bookMeeting.ts" ...>

# After aigx-sync runs:
<file path="src/features/meetings/scheduleMeeting.ts" ...>
```

## What it does NOT do

- It does not add new entries for newly created files (use `aigx-lint --stats` to find missing entries).
- It does not delete entries for deleted files (that's a deliberate choice: deleted entries become a lint
  error, prompting an explicit decision about whether to remove the rule context or just the path).
- It does not modify rule ids or rule text — only `<file path="...">` attributes.

## CI complement

`aigx-sync` is the *prevention* layer; `aigx-lint` is the *detection* layer. Use both:

```yaml
# GitHub Actions
- run: python tools/aigx-sync/aigx_sync.py --dry-run --verbose  # shows any un-synced drift
- run: python tools/aigx-lint/aigx_lint.py --root .             # fails on any remaining errors
```
