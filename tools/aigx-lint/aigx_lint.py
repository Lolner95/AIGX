#!/usr/bin/env python3
"""aigx-lint - validate and resolve AIGX genomes. Zero dependencies (Python 3.8+ stdlib).

A genome decoupled from source is only a liability if it can rot silently. aigx-lint makes that
impossible: it checks the genome against the ACTUAL repository, so a moved/renamed file or a dangling
rule reference fails the check (wire it into CI / a pre-commit hook). It also resolves a single file's
boundary entry in O(1), so an agent never has to ingest a whole index - the answer to monorepo scale.

This is one of the two reference VALIDATORS for AIGX (the other is the `aigx` CLI / @aigx/lint in
packages/). The two MUST report the same errors for the same genome (meta-genome rule ARCH-validator-parity);
the conformance suite in tests/conformance/ checks that they agree. It implements validator rules V1-V7
and security rule S2 of standard/AIGX-1.1.md.

Supports HIERARCHICAL genomes: every `.aigx/` directory under the root is discovered (honoring
`.aigxignore` and `--exclude`); each `files.aigx` indexes its own subtree; `<file path>` values resolve
relative to the repository root.

Usage:
  aigx_lint.py [--root DIR] [--exclude DIR ...] [--format text|json]
                                           # validate the genome(s) under DIR (default: cwd). Exit !=0 on errors.
  aigx_lint.py --resolve PATH [--root DIR] [--format text|json]
                                           # print just the <file> entry for PATH (constant-cost lookup)
  aigx_lint.py --stats [--root DIR] [--format text|json]
                                           # print a summary (genomes, rules, entries, forbids)
  aigx_lint.py --version                    # print the tool version

Exit codes: 0 = ok, 1 = validation errors, 2 = usage / not found.
"""

__version__ = "1.2.0"
import argparse
import json
import os
import re
import sys

RULE_RE = re.compile(r'<rule\s+id="([^"]+)"')
FILE_BLOCK_RE = re.compile(r"<file\b[^>]*>.*?</file>", re.DOTALL)
PATH_ATTR_RE = re.compile(r'<file\b[^>]*\bpath="([^"]+)"')
DOMAIN_ATTR_RE = re.compile(r'<file\b[^>]*\bdomain="([^"]+)"')
CHECK_RE = re.compile(r"<check>(.*?)</check>", re.DOTALL)
FORBID_RE = re.compile(r"<forbid\b")
FORBID_TEXT_RE = re.compile(r"<forbid\b([^>]*)>(.*?)</forbid>", re.DOTALL)
GOTCHA_TEXT_RE = re.compile(r"<gotcha\b([^>]*)>(.*?)</gotcha>", re.DOTALL)
ROLE_TEXT_RE = re.compile(r"<role>(.*?)</role>", re.DOTALL)
PRI_ATTR_RE = re.compile(r'\bpri="([^"]+)"')
COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
SKIP_DIRS = {".git", "node_modules", "dist", "build", "__pycache__", ".venv", "venv"}

# Files in a genome dir that are NOT concern files (carry no <rule id>).
NON_CONCERN = {"files.aigx", "protocol.aigx", "product.aigx"}


def to_posix(p):
    return p.replace("\\", "/")


def escapes_root(p):
    """True if a file-entry path tries to escape the repository root (security S2)."""
    q = to_posix(p)
    return bool(re.search(r"(^|/)\.\.(/|$)", q)) or q.startswith("/") or bool(re.match(r"^[A-Za-z]:", q))


def load_ignores(root, cli_excludes):
    """Repo-relative dir prefixes to skip: --exclude flags plus .aigxignore lines ('#' comments)."""
    ig = list(cli_excludes or [])
    f = os.path.join(root, ".aigxignore")
    if os.path.exists(f):
        for line in read(f).splitlines():
            s = line.split("#", 1)[0].strip().rstrip("/")
            if s:
                ig.append(s)
    return [to_posix(x) for x in ig]


def find_aigx_dirs(root, ignores=()):
    out = []
    for dp, dn, _fn in os.walk(root):
        dn[:] = [d for d in dn if d not in SKIP_DIRS]
        if os.path.basename(dp) == ".aigx":
            rel = to_posix(os.path.relpath(dp, root))
            if any(rel == ig or rel.startswith(ig + "/") for ig in ignores):
                continue
            out.append(dp)
    return sorted(out)


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def semantic_text(path):
    return COMMENT_RE.sub("", read(path))


def text_content(s):
    return re.sub(r"\s+", " ", s).strip()


def priority(attrs):
    m = PRI_ATTR_RE.search(attrs or "")
    return m.group(1) if m else None


def entry_payload(entry):
    block = entry["block"]
    role = ROLE_TEXT_RE.search(block)
    forbid = FORBID_TEXT_RE.search(block)
    gotcha = GOTCHA_TEXT_RE.search(block)
    return {
        "path": entry["path"],
        "domain": entry.get("domain"),
        "role": text_content(role.group(1)) if role else None,
        "forbid": {
            "priority": priority(forbid.group(1)),
            "text": text_content(forbid.group(2)),
        } if forbid else None,
        "gotcha": {
            "priority": priority(gotcha.group(1)),
            "text": text_content(gotcha.group(2)),
        } if gotcha else None,
        "checks": entry["checks"],
        "block": block,
    }


def collect_rules(aigx_dir):
    """Return (unique_ids:set, dup_ids:list) for one genome dir, across its concern files.

    A rule id repeated within a single genome (even across two concern files) is a duplicate (V4)."""
    seen, dups = set(), []
    for fn in sorted(os.listdir(aigx_dir)):
        if fn.endswith(".aigx") and fn not in NON_CONCERN:
            for rid in RULE_RE.findall(semantic_text(os.path.join(aigx_dir, fn))):
                if rid in seen:
                    dups.append(rid)
                else:
                    seen.add(rid)
    return seen, dups


def parse_entries(files_aigx_path):
    """Return list of dicts: {path, checks:[ids], has_forbid, block}."""
    if not os.path.exists(files_aigx_path):
        return []
    text = semantic_text(files_aigx_path)
    entries = []
    for block in FILE_BLOCK_RE.findall(text):
        m = PATH_ATTR_RE.search(block)
        if not m:
            continue
        dm = DOMAIN_ATTR_RE.search(block)
        checks = []
        cm = CHECK_RE.search(block)
        if cm:
            # gloss form may nest <c id="X">; otherwise it's a bare id list
            ids = re.findall(r'id="([^"]+)"', cm.group(1))
            checks = ids if ids else cm.group(1).split()
        entries.append({
            "path": m.group(1).strip(),
            "domain": dm.group(1).strip() if dm else None,
            "checks": checks,
            "has_forbid": bool(FORBID_RE.search(block)),
            "block": block,
        })
    return entries


def gather(root, ignores=()):
    """Gather genomes. Returns (genomes, all_rule_ids). genome = {dir, rules, dups, entries}."""
    genomes = []
    all_rules = set()
    for d in find_aigx_dirs(root, ignores):
        rules, dups = collect_rules(d)
        all_rules |= rules
        entries = parse_entries(os.path.join(d, "files.aigx"))
        genomes.append({"dir": d, "rules": rules, "dups": dups, "entries": entries})
    return genomes, all_rules


def cmd_validate(root, fmt="text", ignores=()):
    genomes, all_rules = gather(root, ignores)
    if not genomes:
        print(f"aigx-lint: no .aigx/ genome found under {root}", file=sys.stderr)
        return 2
    errors, warnings = [], []
    seen_paths = {}
    n_entries = n_forbid = 0
    for g in genomes:
        rel = to_posix(os.path.relpath(g["dir"], root))
        # V4: duplicate rule ids within a genome
        for rid in g["dups"]:
            errors.append(f'[{rel}] duplicate <rule id="{rid}"> (rule ids MUST be unique)')
        # V1: required files / minimum content
        if not g["rules"]:
            errors.append(f"[{rel}] no <rule id> found in any concern file (need ≥1)")
        if not os.path.exists(os.path.join(g["dir"], "protocol.aigx")):
            errors.append(f"[{rel}] missing required protocol.aigx")
        if not os.path.exists(os.path.join(g["dir"], "files.aigx")):
            errors.append(f"[{rel}] missing required files.aigx")
        elif not g["entries"]:
            errors.append(f"[{rel}] files.aigx has no <file> entries (need ≥1)")

        for e in g["entries"]:
            n_entries += 1
            if e["has_forbid"]:
                n_forbid += 1
            # S2: a path that escapes the repo root is rejected (and we skip its other checks)
            if escapes_root(e["path"]):
                errors.append(f'[{rel}] <file path="{e["path"]}"> escapes the repository root')
                continue
            # V3: the indexed file must still exist (catches renames/moves => no silent rot)
            if not os.path.exists(os.path.join(root, e["path"])):
                errors.append(f"[{rel}] file entry path does not exist: {e['path']}")
            # V2: every <check> id must resolve to a real rule somewhere in the genome set
            for cid in e["checks"]:
                if cid not in all_rules:
                    errors.append(f"[{rel}] <check> id '{cid}' (in {e['path']}) does not resolve")
            # V5: duplicate path entries (warning)
            if e["path"] in seen_paths:
                warnings.append(f"duplicate <file> entry for {e['path']} (in {rel} and {seen_paths[e['path']]})")
            else:
                seen_paths[e["path"]] = rel

    # V6: forbid density high enough to dilute salience (warning)
    forbid_percent = round(100 * n_forbid / n_entries) if n_entries else 0
    if forbid_percent > 40:
        warnings.append(f"<forbid> density is {forbid_percent}% of entries — scarcity preserves salience")

    status = "FAIL" if errors else "ok"
    if fmt == "json":
        print(json.dumps({
            "ok": not errors,
            "status": status,
            "genomes": len(genomes),
            "rules": len(all_rules),
            "file_entries": n_entries,
            "errors": errors,
            "warnings": warnings,
        }, indent=2, sort_keys=True))
    else:
        for w in warnings:
            print(f"  warning: {w}")
        for er in errors:
            print(f"  error:   {er}")
        print(f"\naigx-lint: {len(genomes)} genome(s), {len(all_rules)} rules, {n_entries} file entries "
              f"-> {status} ({len(errors)} error(s), {len(warnings)} warning(s))")
    return 1 if errors else 0


def cmd_resolve(root, target, fmt="text", ignores=()):
    target = to_posix(target).lstrip("./")
    genomes, _ = gather(root, ignores)
    for g in genomes:
        for e in g["entries"]:
            if to_posix(e["path"]) == target:
                if fmt == "json":
                    payload = entry_payload(e)
                    payload["found"] = True
                    print(json.dumps(payload, indent=2, sort_keys=True))
                else:
                    print(e["block"])
                return 0
    exists = os.path.exists(os.path.join(root, target))
    if fmt == "json":
        print(json.dumps({
            "found": False,
            "path": target,
            "exists": exists,
            "message": f"no <file> entry for '{target}'",
        }, indent=2, sort_keys=True))
    else:
        stream = sys.stdout if exists else sys.stderr
        print(f"aigx-lint: no <file> entry for '{target}'", file=stream)
    return 0 if exists else 2


def cmd_stats(root, fmt="text", ignores=()):
    genomes, all_rules = gather(root, ignores)
    if not genomes:
        print(f"aigx-lint: no .aigx/ genome found under {root}", file=sys.stderr)
        return 2
    n_entries = sum(len(g["entries"]) for g in genomes)
    n_forbid = sum(1 for g in genomes for e in g["entries"] if e["has_forbid"])
    forbid_percent = (100 * n_forbid // n_entries) if n_entries else 0
    if fmt == "json":
        print(json.dumps({
            "genomes": [{
                "path": to_posix(os.path.relpath(g["dir"], root)),
                "rules": len(g["rules"]),
                "file_entries": len(g["entries"]),
            } for g in genomes],
            "total_rules": len(all_rules),
            "file_entries": n_entries,
            "forbids": n_forbid,
            "forbid_percent": forbid_percent,
        }, indent=2, sort_keys=True))
    else:
        print(f"genomes:      {len(genomes)}")
        for g in genomes:
            print(f"  - {to_posix(os.path.relpath(g['dir'], root))}: {len(g['rules'])} rules, {len(g['entries'])} entries")
        print(f"total rules:  {len(all_rules)}")
        print(f"file entries: {n_entries}")
        print(f"forbids:      {n_forbid}  ({forbid_percent}% of entries - keep this small)")
    return 0


def main(argv=None):
    if argv is None:
        argv = sys.argv[1:]
    # Accept subcommand-style aliases for parity with the npm/cargo `aigx` CLI
    # (e.g. `aigx lint --root .`, `aigx resolve PATH`). Flag-style still works.
    if argv and argv[0] in ("lint", "validate"):
        argv = argv[1:]
    elif len(argv) >= 2 and argv[0] == "resolve":
        argv = ["--resolve", argv[1]] + argv[2:]
    elif argv and argv[0] == "stats":
        argv = ["--stats"] + argv[1:]
    p = argparse.ArgumentParser(prog="aigx-lint", description="Validate and resolve AIGX genomes.")
    p.add_argument("--root", default=".", help="repository root (default: current directory)")
    p.add_argument("--exclude", action="append", default=[], metavar="DIR",
                   help="repo-relative dir to skip (repeatable); also reads .aigxignore")
    p.add_argument("--resolve", metavar="PATH", help="print only the <file> entry for PATH (O(1) lookup)")
    p.add_argument("--stats", action="store_true", help="print a summary of the genome(s)")
    p.add_argument("--format", choices=("text", "json"), default="text", help="output format (default: text)")
    p.add_argument("--version", action="version", version=f"aigx-lint {__version__}")
    args = p.parse_args(argv)
    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print(f"aigx-lint: not a directory: {root}", file=sys.stderr)
        return 2
    ignores = load_ignores(root, args.exclude)
    if args.resolve:
        return cmd_resolve(root, args.resolve, args.format, ignores)
    if args.stats:
        return cmd_stats(root, args.format, ignores)
    return cmd_validate(root, args.format, ignores)


if __name__ == "__main__":
    sys.exit(main())
