#!/usr/bin/env python3
"""AIGX conformance suite runner. Zero dependencies (Python 3.8+ stdlib).

Drives every available reference VALIDATOR against a fixed set of fixtures and asserts they all
agree with the expected outcome. Cross-implementation agreement is the real signal: a fixture is
only "settled" when every reference validator reaches the same verdict (meta-genome rule
ARCH-validator-parity; standard/conformance.md §5).

Validators:
  - python : tools/aigx-lint/aigx_lint.py            (required)
  - node   : packages/aigx/bin/aigx.mjs lint         (required)
  - rust   : crates/aigx/target/{release,debug}/aigx (optional — included if built)

Fixtures:
  POSITIVE — MUST validate clean (exit 0):
    tests/conformance/valid/clean, examples/minimal, examples/sourcing-app
  NEGATIVE — MUST fail (exit != 0), each violating exactly one requirement:
    invalid/missing-protocol (V1), invalid/dangling-check (V2), invalid/stale-path (V3),
    invalid/dup-rule-id (V4), invalid/path-escape (S2)

Exit codes: 0 = every validator agreed with every expectation, 1 = a disagreement/failure, 2 = setup error.
"""
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _run(cmd):
    """Run a validator; return (ok: bool, errors: list[str]). Parses JSON from stdout."""
    try:
        p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    except FileNotFoundError as e:
        return (None, [f"could not run {cmd[0]}: {e}"])
    out = (p.stdout or "").strip()
    try:
        data = json.loads(out)
    except json.JSONDecodeError:
        # Fall back to exit code if a validator didn't emit JSON.
        return (p.returncode == 0, [out or (p.stderr or "").strip()])
    return (bool(data.get("ok")), list(data.get("errors", [])))


def make_validators():
    vs = {}
    py = sys.executable or "python"
    vs["python"] = lambda d: _run([py, "tools/aigx-lint/aigx_lint.py", "--root", d, "--format", "json"])
    if shutil.which("node"):
        vs["node"] = lambda d: _run(["node", "packages/aigx/bin/aigx.mjs", "lint", "--root", d, "--json"])
    for cand in ("crates/aigx/target/release/aigx", "crates/aigx/target/debug/aigx"):
        for ext in ("", ".exe"):
            binp = os.path.join(ROOT, cand + ext)
            if os.path.isfile(binp):
                vs["rust"] = (lambda b: (lambda d: _run([b, "lint", "--root", d, "--json"])))(binp)
                break
        if "rust" in vs:
            break
    return vs


# (fixture dir, expected_ok, required error substring | None)
CASES = [
    ("tests/conformance/valid/clean",            True,  None),
    ("examples/minimal",                         True,  None),
    ("examples/sourcing-app",                    True,  None),
    ("tests/conformance/invalid/missing-protocol", False, "missing required protocol"),
    ("tests/conformance/invalid/dangling-check",   False, "does not resolve"),
    ("tests/conformance/invalid/stale-path",       False, "does not exist"),
    ("tests/conformance/invalid/dup-rule-id",      False, "duplicate <rule id="),
    ("tests/conformance/invalid/path-escape",      False, "escapes the repository root"),
]


def main():
    validators = make_validators()
    required = {"python", "node"}
    missing = required - set(validators)
    if missing:
        print(f"conformance: required validator(s) unavailable: {', '.join(sorted(missing))}", file=sys.stderr)
        return 2

    names = [n for n in ("python", "node", "rust") if n in validators]
    print(f"AIGX conformance suite - validators: {', '.join(names)}\n")
    width = max(len(c[0]) for c in CASES) + 2
    print("  " + "fixture".ljust(width) + "  ".join(n.center(7) for n in names) + "   verdict")
    print("  " + "-" * (width + len(names) * 9 + 10))

    all_ok = True
    for path, expect_ok, needle in CASES:
        cells, ok_case = [], True
        verdicts = []
        for n in names:
            ok, errors = validators[n](path)
            verdicts.append(ok)
            cell = "pass" if ok else "fail"
            # each validator must match the expected outcome
            if ok != expect_ok:
                cell += "!"; ok_case = False
            # for negatives, the right error must be the reason it failed
            if not expect_ok and needle is not None and not any(needle in e for e in errors):
                cell += "?"; ok_case = False
            cells.append(cell.center(7))
        # every validator must agree with every other
        if len(set(verdicts)) != 1:
            ok_case = False
        verdict = "OK" if ok_case else "MISMATCH"
        if not ok_case:
            all_ok = False
        print("  " + path.ljust(width) + "  ".join(cells) + "   " + verdict)

    print()
    if all_ok:
        print(f"conformance: PASS - {len(CASES)} fixtures, {len(names)} validators in agreement")
        return 0
    print("conformance: FAIL — see MISMATCH rows above (! = wrong outcome, ? = wrong error)", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
