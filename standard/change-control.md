# AIGX Change Control

Companion to [`AIGX-1.1.md`](AIGX-1.1.md) §19. Defines who controls the specification, how it changes, and
the compatibility guarantees that changes must honor.

---

## 1. Change controller

The change controller for AIGX is **Grégory Parisotto** (gregory@feex.it). The authoritative source of the
specification is the `standard/` directory of <https://github.com/Lolner95/AIGX>. The change controller has
final say on what enters a normative version; the process below is how proposals reach that decision.

For the IANA media-type registration, the change controller of record is the same person
([`media-type-registration.md`](media-type-registration.md)).

---

## 2. Versioning policy

The specification is versioned `MAJOR.MINOR` (semantic, applied to the spec — distinct from tool versions).

- **MAJOR** — a backward-incompatible change. Examples: removing a required file; changing the meaning of an
  existing element or attribute; changing rule-id syntax; tightening a SHOULD into a MUST in a way that
  invalidates existing conforming genomes.
- **MINOR** — a backward-compatible addition. Examples: adding an OPTIONAL element; adding an integration
  pattern; adding a RECOMMENDED practice; clarifying prose without changing requirements.

Tooling (the `aigx` CLI, `aigx-lint`, `create-aigx`, the npm/PyPI/Cargo packages) is versioned
**independently** with its own `MAJOR.MINOR.PATCH` per [SemVer](https://semver.org). A tool release notes
which spec version it targets. The spec and the tools do not share a version number.

---

## 3. Compatibility guarantees

Within a major version:

- A genome valid under `1.x` MUST remain valid under any `1.y` with `y ≥ x`.
- A consumer for `1.y` MUST read any `1.x` genome with `x ≤ y` (spec §18, §17.5).
- No MINOR release removes a feature or tightens an existing requirement in a way that invalidates a
  previously conforming genome. Such a change waits for the next MAJOR.

Rule-id stability is a genome-level guarantee the spec imposes on producers (spec §9): a producer MUST NOT
rename or delete a rule id, because downstream `<check>` lists, facts, and external references cite it.
Retiring a rule is done by updating or removing the rule while leaving the id retired (never reused for a
different rule).

---

## 4. How to propose a change

1. **Open an issue** at <https://github.com/Lolner95/AIGX/issues> describing the problem the change solves.
   Spec changes are justified by a *failure mode*, ideally one the benchmark can or does measure — AIGX's
   normative SHOULDs are evidence-backed, and new ones SHOULD be too.
2. **Discuss scope.** The change controller and contributors determine whether the change is MAJOR, MINOR,
   or editorial, and whether it needs benchmark evidence before it can carry a normative keyword.
3. **Submit a pull request** against `standard/`. A normative change MUST update: the affected section of
   `AIGX-1.1.md` (or a new `AIGX-<next>.md`), the ABNF and/or JSON schema if syntax/data-model changes, the
   conformance requirements, and `CHANGELOG.md`.
4. **Provide migration notes** for any MAJOR change: what breaks, how to update an existing genome, and
   whether `aigx` tooling can perform the migration automatically.
5. **Update the conformance fixtures** ([`conformance.md`](conformance.md) §5) so the reference validators
   continue to pass on valid genomes and fail on the new negative cases.

---

## 5. Editorial changes

Typos, link fixes, clarifications that do not change a requirement, and example improvements MAY be made
without a version increment. They are recorded in `CHANGELOG.md` under the current `[Unreleased]` heading
and do not require migration notes.

---

## 6. Deprecation policy

A feature is deprecated by:

1. marking it deprecated in the spec text with the version in which deprecation began,
2. keeping it fully functional for the remainder of the current MAJOR version,
3. emitting a validator **warning** (not error) when a deprecated feature is used, and
4. removing it only in the next MAJOR version, with a migration note.

A consumer MUST continue to honor a deprecated-but-not-removed feature within the same major version.

---

## 7. Release artifacts

Each tagged release (`vMAJOR.MINOR.PATCH`) records, in its GitHub release notes:

- the **spec version** it corresponds to,
- the **tool versions** (`aigx` CLI, `aigx-lint`, `create-aigx`),
- **breaking changes** (if any),
- **migration notes** (if any),
- a pointer to the **conformance fixtures** that gate the release.

This keeps the relationship between the moving tool versions and the stable spec version auditable.

---

## 8. Governance evolution

AIGX currently uses a single-change-controller model. If adoption warrants, governance MAY move to a small
working group with a documented decision process; any such change will itself be announced as a MINOR
documentation update and recorded here. Until then, the contact in §1 is authoritative.
