#!/usr/bin/env python3
"""aigx-lint - validate and resolve AIGX genomes. Zero dependencies (Python 3.8+ stdlib).

A genome decoupled from source is only a liability if it can rot silently. aigx-lint makes that
impossible: it checks the genome against the ACTUAL repository, so a moved/renamed file or a dangling
rule reference fails the check (wire it into CI / a pre-commit hook). It also resolves a single file's
boundary entry in O(1), so an agent never has to ingest a whole index - the answer to monorepo scale.

Supports HIERARCHICAL genomes: every `.aigx/` directory under the root is discovered; each `files.aigx`
indexes its own subtree; `<file path>` values resolve relative to the repository root.

Usage:
  aigx_lint.py [--root DIR]                 # validate the genome(s) under DIR (default: cwd). Exit !=0 on errors.
  aigx_lint.py --resolve PATH [--root DIR]  # print just the <file> entry for PATH (constant-cost lookup)
  aigx_lint.py --stats [--root DIR]         # print a summary (genomes, rules, entries, forbids)
  aigx_lint.py --version                    # print the tool version

Exit codes: 0 = ok, 1 = validation errors, 2 = usage / not found.
"""

__version__ = "1.1.0"
import argparse
import os
import re
import sys

RULE_RE = re.compile(r'<rule\s+id="([^"]+)"')
FILE_BLOCK_RE = re.compile(r"<file\b[^>]*>.*?</file>", re.DOTALL)
PATH_ATTR_RE = re.compile(r'<file\b[^>]*\bpath="([^"]+)"')
CHECK_RE = re.compile(r"<check>(.*?)</check>", re.DOTALL)
FORBID_RE = re.compile(r"<forbid\b")
SKIP_DIRS = {".git", "node_modules", "dist", "build", "__pycache__", ".venv", "venv"}


def find_aigx_dirs(root):
    out = []
    for dp, dn, _fn in os.walk(root):
        dn[:] = [d for d in dn if d not in SKIP_DIRS]
        if os.path.basename(dp) == ".aigx":
            out.append(dp)
    return sorted(out)


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def collect_rule_ids(aigx_dir):
    ids = set()
    for fn in os.listdir(aigx_dir):
        if fn.endswith(".aigx") and fn != "files.aigx":
            ids.update(RULE_RE.findall(read(os.path.join(aigx_dir, fn))))
    return ids


def parse_entries(files_aigx_path):
    """Return list of dicts: {path, checks:[ids], has_forbid, block}."""
    if not os.path.exists(files_aigx_path):
        return []
    text = read(files_aigx_path)
    entries = []
    for block in FILE_BLOCK_RE.findall(text):
        m = PATH_ATTR_RE.search(block)
        if not m:
            continue
        checks = []
        cm = CHECK_RE.search(block)
        if cm:
            # gloss form may nest <c id="X">; otherwise it's a bare id list
            ids = re.findall(r'id="([^"]+)"', cm.group(1))
            checks = ids if ids else cm.group(1).split()
        entries.append({
            "path": m.group(1).strip(),
            "checks": checks,
            "has_forbid": bool(FORBID_RE.search(block)),
            "block": block,
        })
    return entries


def gather(root):
    """Gather genomes. Returns (genomes, all_rule_ids). genome = {dir, rules, entries}."""
    genomes = []
    all_rules = set()
    for d in find_aigx_dirs(root):
        rules = collect_rule_ids(d)
        all_rules |= rules
        entries = parse_entries(os.path.join(d, "files.aigx"))
        genomes.append({"dir": d, "rules": rules, "entries": entries})
    return genomes, all_rules


def cmd_validate(root):
    genomes, all_rules = gather(root)
    if not genomes:
        print(f"aigx-lint: no .aigx/ genome found under {root}", file=sys.stderr)
        return 2
    errors, warnings = [], []
    seen_paths = {}
    for g in genomes:
        rel = os.path.relpath(g["dir"], root)
        for e in g["entries"]:
            abspath = os.path.join(root, e["path"])
            # 1) the indexed file must still exist (catches renames/moves => no silent rot)
            if not os.path.exists(abspath):
                errors.append(f"[{rel}] file entry path does not exist: {e['path']}")
            # 2) every <check> id must resolve to a real rule somewhere in the genome set
            for cid in e["checks"]:
                if cid not in all_rules:
                    errors.append(f"[{rel}] <check> id '{cid}' (in {e['path']}) does not resolve to any <rule id>")
            # 3) duplicate path entries
            if e["path"] in seen_paths:
                warnings.append(f"duplicate <file> entry for {e['path']} (in {rel} and {seen_paths[e['path']]})")
            else:
                seen_paths[e["path"]] = rel

    n_entries = sum(len(g["entries"]) for g in genomes)
    for w in warnings:
        print(f"  warning: {w}")
    for er in errors:
        print(f"  error:   {er}")
    status = "FAIL" if errors else "ok"
    print(f"\naigx-lint: {len(genomes)} genome(s), {len(all_rules)} rules, {n_entries} file entries "
          f"-> {status} ({len(errors)} error(s), {len(warnings)} warning(s))")
    return 1 if errors else 0


def cmd_resolve(root, target):
    target = target.replace("\\", "/").lstrip("./")
    genomes, _ = gather(root)
    for g in genomes:
        for e in g["entries"]:
            if e["path"].replace("\\", "/") == target:
                print(e["block"])
                return 0
    print(f"aigx-lint: no <file> entry for '{target}'", file=sys.stderr)
    return 2


def cmd_stats(root):
    genomes, all_rules = gather(root)
    if not genomes:
        print(f"aigx-lint: no .aigx/ genome found under {root}", file=sys.stderr)
        return 2
    n_entries = sum(len(g["entries"]) for g in genomes)
    n_forbid = sum(1 for g in genomes for e in g["entries"] if e["has_forbid"])
    print(f"genomes:      {len(genomes)}")
    for g in genomes:
        print(f"  - {os.path.relpath(g['dir'], root)}: {len(g['rules'])} rules, {len(g['entries'])} entries")
    print(f"total rules:  {len(all_rules)}")
    print(f"file entries: {n_entries}")
    print(f"forbids:      {n_forbid}  ({(100*n_forbid//n_entries) if n_entries else 0}% of entries - keep this small)")
    return 0


def main(argv=None):
    p = argparse.ArgumentParser(prog="aigx-lint", description="Validate and resolve AIGX genomes.")
    p.add_argument("--root", default=".", help="repository root (default: current directory)")
    p.add_argument("--resolve", metavar="PATH", help="print only the <file> entry for PATH (O(1) lookup)")
    p.add_argument("--stats", action="store_true", help="print a summary of the genome(s)")
    p.add_argument("--version", action="version", version=f"aigx-lint {__version__}")
    args = p.parse_args(argv)
    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print(f"aigx-lint: not a directory: {root}", file=sys.stderr)
        return 2
    if args.resolve:
        return cmd_resolve(root, args.resolve)
    if args.stats:
        return cmd_stats(root)
    return cmd_validate(root)


if __name__ == "__main__":
    sys.exit(main())
