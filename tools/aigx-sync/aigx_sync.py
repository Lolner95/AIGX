#!/usr/bin/env python3
"""aigx-sync - automatically patch files.aigx when source files are renamed or moved.

Install as a git pre-commit hook so index drift is physically impossible:

    cp tools/aigx-sync/aigx_sync.py .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit

How it works:
  1. Reads staged renames from `git diff --staged --name-status --diff-filter=R`
  2. For each old_path → new_path, rewrites the `path="..."` attribute in every files.aigx
  3. Re-stages the modified files.aigx so the commit includes the fix automatically
  4. Prints a summary (quiet unless changes were made or --verbose is set)

Usage:
  python aigx_sync.py [--root DIR] [--dry-run] [--verbose]

  --dry-run   show what would change but do not write or stage anything
  --verbose   print all renames checked, not just those that triggered a patch
  --root DIR  repository root (default: current directory)

Exit codes: 0 = nothing to do / all patched, 1 = error (e.g. git not available)
"""
import argparse
import os
import re
import subprocess
import sys

PATH_ATTR_RE = re.compile(r'(<file\b[^>]*\bpath=")([^"]+)(")')
SKIP_DIRS = {".git", "node_modules", "dist", "build", "__pycache__", ".venv", "venv"}


# ── git helpers ───────────────────────────────────────────────────────────────

def git_staged_renames(root):
    """Return list of (old_path, new_path) from staged renames. Paths are POSIX-slash."""
    try:
        out = subprocess.check_output(
            ["git", "diff", "--staged", "--name-status", "--diff-filter=R"],
            cwd=root, text=True, stderr=subprocess.DEVNULL
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return []
    renames = []
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) == 3 and parts[0].startswith("R"):
            old, new = parts[1].replace("\\", "/"), parts[2].replace("\\", "/")
            renames.append((old, new))
    return renames


def git_stage(root, path):
    """Stage a file."""
    subprocess.run(["git", "add", path], cwd=root, check=True, stderr=subprocess.DEVNULL)


# ── core ──────────────────────────────────────────────────────────────────────

def find_files_aigx(root):
    """Find all files.aigx under root, skipping noise dirs."""
    found = []
    for dp, dn, fns in os.walk(root):
        dn[:] = [d for d in dn if d not in SKIP_DIRS]
        if "files.aigx" in fns:
            found.append(os.path.join(dp, "files.aigx"))
    return found


def patch_files_aigx(filepath, renames, dry_run, verbose):
    """Rewrite path attributes for any matched rename. Returns True if changed."""
    with open(filepath, encoding="utf-8") as f:
        text = f.read()

    original = text
    rename_map = {old: new for old, new in renames}

    def replacer(m):
        prefix, path, suffix = m.group(1), m.group(2), m.group(3)
        normed = path.replace("\\", "/")
        if normed in rename_map:
            new_path = rename_map[normed]
            if verbose or dry_run:
                rel = os.path.relpath(filepath)
                print(f"  {'[dry-run] ' if dry_run else ''}patching {rel}: {path} → {new_path}")
            return prefix + new_path + suffix
        return m.group(0)

    patched = PATH_ATTR_RE.sub(replacer, text)

    if patched == original:
        return False

    if not dry_run:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(patched)
    return True


def main(argv=None):
    p = argparse.ArgumentParser(prog="aigx-sync",
        description="Patch files.aigx path entries when source files are renamed.")
    p.add_argument("--root", default=".", help="repository root (default: cwd)")
    p.add_argument("--dry-run", action="store_true", help="show changes without writing")
    p.add_argument("--verbose", action="store_true", help="print all checks, not just patches")
    args = p.parse_args(argv)

    root = os.path.abspath(args.root)
    renames = git_staged_renames(root)

    if not renames:
        if args.verbose:
            print("aigx-sync: no staged renames found")
        return 0

    if args.verbose or args.dry_run:
        print(f"aigx-sync: {len(renames)} staged rename(s) found")
        for old, new in renames:
            print(f"  {old} → {new}")

    all_files_aigx = find_files_aigx(root)
    patched_any = False

    for fa in all_files_aigx:
        changed = patch_files_aigx(fa, renames, dry_run=args.dry_run, verbose=args.verbose)
        if changed and not args.dry_run:
            git_stage(root, fa)
            patched_any = True

    if patched_any:
        print(f"aigx-sync: patched and staged {sum(1 for fa in all_files_aigx if True)} files.aigx file(s)")
    elif args.verbose:
        print("aigx-sync: no files.aigx entries matched the renames")

    return 0


if __name__ == "__main__":
    sys.exit(main())
