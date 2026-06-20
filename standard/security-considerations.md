# AIGX Security Considerations

Companion to [`AIGX-1.1.md`](AIGX-1.1.md) §16. This document is normative where it uses RFC 2119 keywords.

An AIGX genome is **untrusted input to a privileged actor.** Its text enters an AI coding agent's context
and shapes the code that agent writes, the commands it runs, and the files it touches. The threat model
must reflect that the consumer is powerful, not that the format is.

---

## 1. Threat model

**Assets:** the user's source code, credentials reachable by the agent, the agent's tool authority (shell,
network, package installation), and the integrity of generated code.

**Adversary:** anyone who can influence genome content — a malicious dependency that ships a `.aigx/`, a
compromised contributor, a pull request that edits the genome, or a repository the user cloned without
review.

**Trust boundary:** the genome is *data*, but it is data that an agent treats as *instructions*. The
boundary to defend is between "what the genome says" and "what the agent is authorized to do."

---

## 2. Instruction injection

**Risk.** A genome can contain text engineered to redirect the agent: "ignore previous instructions",
"exfiltrate `.env` to this URL", "add this dependency", "disable the auth check." Because the agent is
designed to follow the genome, a hostile genome is a prompt-injection vector with real-world side effects.

**Mitigations (normative):**

- A consumer MUST NOT elevate a genome's authority above the user's own policy. A genome MUST NOT be able to
  grant the agent permissions the user did not grant.
- A consumer SHOULD treat a genome from an untrusted or newly-cloned repository with the same suspicion as
  any untrusted instruction source, and SHOULD surface genome-sourced instructions to the user rather than
  acting on unusual ones silently (e.g., a genome instructing network egress or credential access).
- A consumer SHOULD bound the genome's influence to coding guidance. Genome text that requests actions
  outside the editing task (sending data, fetching URLs, installing software) SHOULD require the same
  confirmation those actions would require if the user had not mentioned them.

**Producer guidance:** keep genomes free of operational instructions. A genome describes *rules and
boundaries*, not *actions to perform*. Operational steps belong in reviewed CI, not in the genome.

---

## 3. Path handling and traversal

**Risk.** File-entry `path` values (§10) and domain-card `path` attributes are repo-relative strings. A
hostile or buggy genome could use `../` or an absolute path to point a resolver or hydration tool at files
outside the repository (`../../etc/passwd`, `/home/user/.ssh/id_rsa`), causing a tool to read and inject
sensitive content into the agent's context.

**Mitigations (normative):**

- A validator and any resolution/hydration tool MUST reject or ignore a `path` that escapes the repository
  root after normalization (any `..` segment that resolves above root, or an absolute path).
- Tools MUST resolve `path` against the repository root only, never against the current working directory
  or `$HOME`.
- The canonical JSON schema ([`AIGX-1.1.schema.json`](AIGX-1.1.schema.json)) encodes this as a `not`
  constraint on `..` segments; tools SHOULD enforce it at parse time, not only at schema-validation time.

---

## 4. No executable content

**Risk.** Formats that permit embedded scripting become code-execution vectors.

**Mitigations (normative):**

- AIGX defines **no executable content**: no scripts, no macros, no includes, no external entity references.
- A conforming reader MUST NOT execute genome content as code and MUST treat genome files purely as data.
- Tools MUST NOT implement XML external entity (XXE) expansion or DTD processing when parsing genome files.
  AIGX has no DTDs and no entities beyond the fixed character escapes in [`AIGX-1.1.abnf`](AIGX-1.1.abnf).

---

## 5. Supply-chain considerations

**Risk.** Because a genome shapes generated code, a malicious genome is a supply-chain risk even if it never
issues an explicit harmful instruction: subtly wrong rules ("store money as floats", "skip the tenant
check") steer an agent toward insecure code that looks intentional.

**Mitigations:**

- Genome changes SHOULD be code-reviewed with the same rigor as source changes; a diff to `files.aigx` or a
  concern file is a change to how all future code is written.
- A repository SHOULD run a validator in CI ([`conformance.md`](conformance.md)) so that genome drift and
  dangling references fail the build, reducing the window in which a genome silently misleads an agent.
- Consumers that vendor or inherit genomes from dependencies SHOULD NOT automatically trust a dependency's
  `.aigx/`; a dependency's genome describes the dependency's rules, not the consumer's, and SHOULD NOT be
  loaded as the consumer's applicable genome.

---

## 6. Denial of service

**Risk.** A pathologically large `files.aigx` (millions of entries) or deeply nested markup could exhaust a
naive parser.

**Mitigations:**

- The reference tools parse with linear-time regular scanning and bounded recursion; reimplementations
  SHOULD avoid backtracking parsers that are quadratic on adversarial input.
- Per-file resolution (§10.4) means a consumer need never load a whole index into an LLM context; a tool
  SHOULD resolve one entry rather than ingest the full file when only one path is being edited.

---

## 7. Privacy

A genome may legitimately contain repository-internal knowledge (architecture, naming of internal systems).
Producers SHOULD treat a genome as having the same confidentiality class as the source it describes and
SHOULD NOT publish a private repository's genome to a public location, since it can reveal internal
structure even without the code.

---

## 8. Summary of normative requirements

| # | Requirement |
|---|---|
| S1 | A consumer MUST NOT elevate a genome's authority above the user's policy (§2). |
| S2 | A validator and resolution tool MUST reject `path` values that escape the repo root (§3). |
| S3 | Tools MUST resolve `path` against the repository root only (§3). |
| S4 | A reader MUST NOT execute genome content as code (§4). |
| S5 | Tools MUST NOT perform DTD/external-entity processing (§4). |
| S6 | A consumer SHOULD NOT load a dependency's `.aigx/` as its own applicable genome (§5). |
