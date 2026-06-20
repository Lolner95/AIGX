# AIGX Standard

This directory holds the **normative standard** for AIGX — the documents a real specification carries, in
the structure IANA and standards reviewers expect. The friendly, example-led overview lives in the
repository [`README.md`](../README.md) and [`SPEC.md`](../SPEC.md); **this** directory is the authoritative,
citable version.

## Documents

| Document | What it is |
|---|---|
| [`AIGX-1.1.md`](AIGX-1.1.md) | The normative specification, v1.1. 20 sections, RFC 2119 language. **Start here.** |
| [`AIGX-1.1.abnf`](AIGX-1.1.abnf) | Formal grammar of the surface syntax (RFC 5234 ABNF). |
| [`AIGX-1.1.schema.json`](AIGX-1.1.schema.json) | Canonical JSON data model (JSON Schema 2020-12) for programmatic interchange. |
| [`media-type-registration.md`](media-type-registration.md) | IANA registration template for `application/aigx` (RFC 6838). |
| [`security-considerations.md`](security-considerations.md) | Threat model and normative security requirements (S1–S6). |
| [`conformance.md`](conformance.md) | Conformance targets, levels, the reference validators, and the test suite. |
| [`interoperability.md`](interoperability.md) | Media type, semantic parity, coexistence, version negotiation (I1–I5). |
| [`change-control.md`](change-control.md) | Who controls the spec, versioning policy, and how to propose changes. |

## At a glance

| | |
|---|---|
| Format name | AIGX |
| Long name | AI Genome Exchange |
| Version | 1.1 (stable) |
| File extension | `.aigx` |
| Directory convention | `.aigx/` |
| Media type | `application/aigx` |
| Encoding | UTF-8 |
| Spec license | CC-BY-4.0 ([`LICENSE`](LICENSE)) |
| Tool license | MIT ([`../LICENSE`](../LICENSE)) |
| Change controller | Grégory Parisotto (gregory@feex.it) |

## Relationship to `SPEC.md`

[`SPEC.md`](../SPEC.md) at the repository root is the informal, example-led specification kept for quick
reading and for links already in the wild. For conformance purposes, **`AIGX-1.1.md` in this directory
governs**; where the two differ, this directory is authoritative.

## Licensing

The specification **text** in this directory is licensed under
[Creative Commons Attribution 4.0 International (CC-BY-4.0)](LICENSE) — you may reproduce, translate, and
build on it with attribution, which is what a standard wants. The reference **tools** (the `aigx` CLI,
`aigx-lint`, `create-aigx`, `aigx-sync`, and the packages) are licensed [MIT](../LICENSE). This split — open
spec, permissive tools — is the standard pattern for a format meant to be reimplemented freely.
