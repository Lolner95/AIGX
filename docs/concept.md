# The Concept — Why a "Genome"?

AIGX stands for **AI Genome Exchange**. The name is not decoration; it's the design.

## The biological idea

A **genome** is the complete set of instructions that builds and operates a living organism. Three things
about how a genome works are worth borrowing:

1. **It's central, not scattered.** A cell doesn't carry a separate copy of every instruction taped to
   each protein. The instructions live in one place — the genome — and the cell *consults* it.
2. **Expression is local.** The same genome is present everywhere, but in each tissue only the relevant
   genes are *expressed*. A liver cell and a neuron share a genome but behave differently because of
   **which genes are active where.**
3. **It's a portable, readable record.** A genome can be sequenced, shared, and read by any reader that
   knows the code. It's an *exchange* format for "how this organism works."

## The mapping to your codebase

A codebase has exactly the same need: a central, portable description of "how this project works" that any
AI agent can read to inherit your conventions — with **local expression**, because the rule that matters
when editing `bookMeeting.ts` is not the rule that matters when editing `cacheHeaders.ts`.

| Biology | AIGX | Why it matters |
|---|---|---|
| Genome (central instruction set) | `.aigx/` directory | One source of truth; your code stays clean |
| Gene (stable-named instruction) | `<rule id="ARCH-2">` | Stable ids = a citable cross-reference backbone |
| Gene **expression** per tissue | `files.aigx` per-file index | The agent gets *which rules apply here* |
| Regulatory context per cell type | `<domain>.aigx` cards | Per-feature context, colocated |
| Sequencing / exchange | the `.aigx` format itself | Portable; any agent can read it |
| The organism (the body) | your **source code** | Operated *by* the genome, never *polluted* by it |

The punchline: **a genome is consulted, not copied into every cell.** That's exactly why AIGX is
centralized and injects nothing into your source. The rules live in `.aigx/`; the per-file index is the
*expression map* that tells the agent which rules are "active" at the file it's editing; and your code —
the organism — stays untouched.

## Why this beat the alternatives (empirically)

This isn't just a pretty metaphor — it predicted what won the benchmark:

- **"Consulted, not copied" → centralized beats in-source.** Injecting context as inline source comments
  (copying the instructions into every cell) measurably *hurt* a strong model. The genome belongs in one
  place.
- **"Expression is local" → the per-file index is the keystone.** Agents read selectively at the edit
  site. The index puts the binding constraint one lookup away, which is the single biggest lever we found.
- **"Stable gene names" → rule ids are the backbone.** `<check>ARCH-2 DATA-1</check>` works because the
  ids are stable references, not restated prose.

## "Exchange"

The last word matters too. AIGX is meant to be a **shared standard** — a genome you author once and can
hand to *any* agent (Claude, Cursor, Copilot, Aider, a custom one) or *export* down to a flat
`AGENTS.md`/`CLAUDE.md` when a specific tool wants that. You're not betting on one vendor's config file;
you're describing your codebase in a portable substrate that everything can read.

That's the whole idea: **the genome of your codebase, for the age of AI agents.**
