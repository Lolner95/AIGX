# JIT Context Hydration

**The default AIGX integration** (the [agent addendum](../SPEC.md#4-the-agent-addendum-agent-addendum))
asks the *agent* to read `.aigx/protocol.aigx`, load concern files, and look up its entry in
`files.aigx` — a multi-step reading sequence before every task.

This works, but it has a failure mode: under latency pressure, some models skip one or more reads
("tool laziness"), and the constraint that was supposed to be binding never lands in the context window.

**JIT (Just-In-Time) context hydration** flips the responsibility: the *environment* — not the agent —
resolves the genome entry for the file being edited, and injects it directly into the system prompt
*before* inference runs. The agent receives the constraint pre-loaded; it doesn't have to earn it through
sequential tool calls.

> **The distinction:** the agent addendum says "go read the genome."
> JIT hydration says "here is what the genome says about the file you're about to edit."

---

## The core primitive: `aigx-lint --resolve`

`aigx-lint --resolve <path>` returns exactly one `<file>` entry — role, forbid, gotcha, and check ids —
in O(1), regardless of how large the index is. This is the lookup primitive that JIT hydration builds on.

```bash
python tools/aigx-lint/aigx_lint.py --resolve src/features/meetings/bookMeeting.ts --root .
# prints:
#   <file path="src/features/meetings/bookMeeting.ts" domain="meetings">
#     <role>Book a meeting (validate slot + contact)</role>
#     <forbid pri="CRIT">NEVER import @/features/suppliers/internal/*</forbid>
#     <gotcha pri="CRIT">get contact_email from the public API, not the internal mapper</gotcha>
#     <check>ARCH-no-deep-imports ARCH-no-cycles DATA-integer-cents TEST-failing-first</check>
#   </file>
```

---

## Pattern 1: MCP tool integration

Expose `aigx-lint --resolve` as an MCP (Model Context Protocol) tool. The IDE or agent client calls it
automatically when the agent opens a file, and prepends the result to the context for that inference call.

**Tool definition:**

```json
{
  "name": "aigx_resolve",
  "description": "Return the AIGX boundary entry for a source file: its role, forbidden imports, the single most important gotcha, and the rule ids to verify before finishing. Call this before editing any file.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Repo-relative path of the file about to be edited (e.g. src/features/meetings/bookMeeting.ts)."
      }
    },
    "required": ["path"]
  }
}
```

**Handler (Python, zero deps):**

```python
import subprocess, json, sys

def handle_aigx_resolve(path: str, repo_root: str) -> str:
    result = subprocess.run(
        ["python", "tools/aigx-lint/aigx_lint.py", "--resolve", path, "--root", repo_root],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return f"No AIGX entry found for {path}. Proceed with general caution."
    return result.stdout.strip()
```

**Wire it into Claude Code (CLAUDE.md):**

```
This repo exposes an MCP tool `aigx_resolve`. Before editing any file, call
aigx_resolve(path=<relative path>) and treat its output as binding constraints for that file.
```

---

## Pattern 2: Pre-prompt injection (CI / CLI wrapper)

In a CLI tool, CI pipeline, or custom agent harness, resolve the entry before constructing the LLM
request and splice it into the system prompt:

```python
import subprocess

def build_system_prompt(base_prompt: str, target_file: str, repo_root: str) -> str:
    """Inject AIGX boundary for target_file into the system prompt."""
    result = subprocess.run(
        ["python", "tools/aigx-lint/aigx_lint.py", "--resolve", target_file, "--root", repo_root],
        capture_output=True, text=True
    )
    if result.returncode != 0 or not result.stdout.strip():
        return base_prompt  # no entry - fall back to base prompt

    boundary = result.stdout.strip()
    injection = (
        f"\n\n--- AIGX boundary for {target_file} ---\n"
        f"{boundary}\n"
        f"Obey the <forbid> constraint. Heed the <gotcha>. "
        f"Verify every id in <check> before finishing.\n"
        f"---\n"
    )
    return base_prompt + injection
```

---

## Pattern 3: Editor extension (VS Code / JetBrains)

The planned VS Code extension (see [roadmap](roadmap.md)) will use this pattern:

1. On `onDidOpenTextDocument`, call `aigx_resolve` for the opened file.
2. Show the result in a hover card or status-bar tooltip.
3. On agent task start, inject the resolved entry into the system prompt via the extension API.

Until the extension ships, Cursor users can wire this via a `.cursor/rules` rule that references the MCP
tool, and Claude Code users can add the MCP tool to their `CLAUDE.md`.

---

## When NOT to use JIT hydration

JIT hydration is an *environment* concern, not a *spec* concern. You don't need it if:

- You're using a capable model that reliably follows multi-step reading instructions.
- Your genome is small enough that loading it whole is cheap (under ~20 files).
- You prefer the agent to own its full read/plan/edit loop.

The agent addendum approach (§4) remains valid and simpler to set up. JIT hydration is for teams who
notice the agent skipping reads under pressure and want a more reliable constraint delivery mechanism.

---

## Relationship to aigx-sync

JIT hydration handles *reading* correctly under latency pressure.
[aigx-sync](../tools/aigx-sync/) handles *writing* correctly when files move.
Both are environment-level fixes for environment-level failure modes; the spec (genome format) is
unchanged by either.
