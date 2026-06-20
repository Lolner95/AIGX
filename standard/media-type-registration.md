# Media Type Registration — `application/aigx`

This document is the media type registration template for AIGX, prepared per
[RFC 6838](https://www.rfc-editor.org/rfc/rfc6838) ("Media Type Specifications and Registration
Procedures"). It is ready to submit to IANA via the application at
<https://www.iana.org/form/media-types>. Until accepted by IANA, `application/aigx` is used as an
**unregistered** type by AIGX tooling; this document tracks the intended registration.

---

## Registration form

**Type name:** `application`

**Subtype name:** `aigx`

**Required parameters:** none

**Optional parameters:** none.
The character encoding is always UTF-8 (AIGX-1.1.md §4); there is no `charset` parameter. A `charset`
parameter, if supplied by a generic agent, MUST be `utf-8` and is otherwise to be ignored.

**Encoding considerations:**
`8bit`. AIGX files are UTF-8 text and contain arbitrary Unicode in element text. When transported over a
protocol that is not 8-bit clean, base64 or quoted-printable Content-Transfer-Encoding is appropriate.

**Security considerations:**
AIGX content is consumed by AI coding agents and influences code those agents write; it is untrusted input
to a privileged actor. Principal risks are instruction injection (a genome directing an agent to take
harmful actions), path traversal via file-entry `path` values, and supply-chain influence on generated
code. The format defines no executable content and no scripting; conforming readers MUST NOT execute genome
content as code, MUST reject `path` values that escape the repository root, and MUST NOT elevate a genome's
authority above the user's own policy. See [`security-considerations.md`](security-considerations.md) for
the full analysis.

**Interoperability considerations:**
AIGX uses XML-style tags but is not required to be a valid XML document; consumers tolerate minor
ill-formedness (AIGX-1.1.md §8.1). For this reason the subtype is `application/aigx`, **not**
`application/aigx+xml` — the `+xml` structured-syntax suffix
([RFC 7303](https://www.rfc-editor.org/rfc/rfc7303)) asserts XML well-formedness, which AIGX does not
require. Genomes are versioned `MAJOR.MINOR` (AIGX-1.1.md §18) with a backward-compatibility contract;
consumers accept any minor version of a major version they support. See
[`interoperability.md`](interoperability.md).

**Published specification:**
AIGX-1.1.md and its companion documents in the `standard/` directory of
<https://github.com/Lolner95/AIGX>. The normative specification is [`AIGX-1.1.md`](AIGX-1.1.md); the formal
grammar is [`AIGX-1.1.abnf`](AIGX-1.1.abnf).

**Applications that use this media type:**
AI coding agents and their host environments — including Claude Code, Cursor, GitHub Copilot, Windsurf,
and Aider — plus validation, scaffolding, and editor tooling (`aigx` CLI, `aigx-lint`, `create-aigx`,
`aigx-sync`, and editor/MCP integrations).

**Fragment identifier considerations:**
A fragment identifier on an `application/aigx` resource MAY denote a rule id (`#ARCH-no-deep-imports`) or a
file-entry path. There is no standardized fragment scheme in v1.1; fragment semantics are reserved for a
future version.

**Restrictions on usage:** none.

**Additional information:**

- **Deprecated alias names for this type:** none.
- **Magic number(s):** none. AIGX files have no required leading byte signature. They are typically the
  first child of a directory named `.aigx`; a file commonly begins with `<aigx-` after optional whitespace
  or an XML comment, but this is not guaranteed and MUST NOT be relied upon for type detection.
- **File extension(s):** `.aigx`
- **Macintosh file type code(s):** `TEXT`
- **Uniform Type Identifier (UTI):** conforms to `public.text`; suggested UTI `io.feex.aigx` (not yet
  registered with Apple).
- **Object Identifiers:** none.

**Person & email address to contact for further information:**
Grégory Parisotto — gregory@feex.it

**Intended usage:** COMMON

**Author:** Grégory Parisotto

**Change controller:** Grégory Parisotto (gregory@feex.it). See [`change-control.md`](change-control.md).

**Provisional registration?** Yes (intended). This template is prepared for submission; the registration is
not yet on file with IANA.

---

## Notes for the submitter

- Submit via <https://www.iana.org/form/media-types>; the expert review is described in RFC 6838 §5.
- Because `application/aigx` is a vendor-neutral, openly specified format, it targets the **standards tree**
  (no `vnd.` or `prs.` prefix), which requires a published, stable specification — satisfied by the
  `standard/` directory.
- If reviewers prefer the `+xml` suffix, the correct response is that AIGX explicitly does not mandate XML
  well-formedness (AIGX-1.1.md §8.1), so `+xml` would over-promise. Keep `application/aigx`.
