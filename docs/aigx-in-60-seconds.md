# AIGX in 60 seconds

**AIGX is a `.aigx/` folder that tells AI coding agents how a repo works** — its rules, its per-file
boundaries, its gotchas — without putting a single comment in your source code.

---

## The one command

```bash
npx create-aigx
```

Or with the CLI:

```bash
npm install -g @aigx/cli   # or: npx @aigx/cli init
aigx init
```

---

## The minimum valid genome

Three files. That's it.

```text
.aigx/
  protocol.aigx       # how an agent should read the genome
  architecture.aigx   # your rules, each with a stable id
  files.aigx          # per-file boundaries — the keystone
```

---

## A tiny example

**`.aigx/architecture.aigx`** — your rules, each with a stable id:

```xml
<aigx-architecture>
  <rule id="ARCH-no-deep-imports">Import features only through their public barrel. Deep imports are forbidden.</rule>
</aigx-architecture>
```

**`.aigx/files.aigx`** — for each file an agent edits, its boundary:

```xml
<aigx-files>
  <file path="src/features/auth/login.ts" domain="auth">
    <role>Handle login — validate credentials, issue a session</role>
    <forbid pri="CRIT">NEVER import @/features/billing/internal/*</forbid>
    <gotcha>token expiry is checked at read-time, not issue-time</gotcha>
    <check>ARCH-no-deep-imports</check>
  </file>
</aigx-files>
```

**`.aigx/protocol.aigx`** — the read order (the starter writes this for you):

```xml
<aigx-protocol version="1.1">
  <read-first>For EACH file you edit, find its &lt;file&gt; entry in .aigx/files.aigx; obey its
   &lt;forbid&gt; and verify every id in its &lt;check&gt; before finishing.</read-first>
  <step n="1">Read the concern files your task touches.</step>
  <step n="2">Read .aigx/files.aigx for each file you edit.</step>
  <step n="3">Minimal change; verify &lt;check&gt; ids before done.</step>
</aigx-protocol>
```

---

## How an agent uses it

When the agent is about to edit `src/features/auth/login.ts`, it looks that path up in `files.aigx` and
gets the binding constraint **at the edit site**: don't deep-import billing, mind the token-expiry gotcha,
verify `ARCH-no-deep-imports` before finishing. No scrolling a thousand-line rules doc. No comments in your
code.

---

## Validate it

```bash
aigx lint          # required files exist, all <check> ids resolve, no stale paths, no dup ids
aigx resolve src/features/auth/login.ts   # show one file's boundary
```

---

## Next steps

- The complete worked example → [`examples/sourcing-app/`](../examples/sourcing-app/)
- Write your own → [`docs/authoring-guide.md`](authoring-guide.md)
- Wire up your agent (Cursor, Claude Code, Copilot, …) → [`integrations/`](../integrations/)
- The full normative spec → [`standard/AIGX-1.1.md`](../standard/AIGX-1.1.md)
