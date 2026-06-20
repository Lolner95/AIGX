# AIGX on GitHub (Linguist)

This kit registers **AIGX** as a language in [github/linguist](https://github.com/github-linguist/linguist),
so `.aigx` files get a language label and proper **syntax highlighting on GitHub** (blobs, diffs, search).

## Two ways to highlight `.aigx`

### 1. Now — `.gitattributes` (interim)

This repo's [`.gitattributes`](../../.gitattributes) already does:

```gitattributes
*.aigx linguist-language=XML linguist-detectable=false
```

GitHub renders `.aigx` with **XML highlighting today** (AIGX is XML-style) and keeps it out of the
repository language bar. Any repo adopting AIGX can copy that one line. Remove it once AIGX lands in
Linguist proper.

### 2. Proper — a Linguist pull request

Registering AIGX in Linguist gives it its own label, color, and grammar (`tm_scope: source.aigx`).

**Heads-up on the bar:** Linguist's policy is that a new language should be **in use across a few hundred
repositories** before it's merged. Land adoption first; this kit makes the PR mechanical when you're ready.

**Steps:**

1. Fork and clone `github-linguist/linguist`.
2. **Add the language** — paste [`languages.yml`](languages.yml) into `lib/linguist/languages.yml`
   (alphabetical order). Replace the placeholder `language_id` with the value Linguist's tests tell you to
   use (`bundle exec rake test` reports collisions; ids are otherwise stable random integers).
3. **Add the grammar** — AIGX's canonical grammar lives at
   [`editors/textmate/aigx.tmLanguage.json`](../textmate/aigx.tmLanguage.json) with `scopeName: source.aigx`.
   Register it:
   ```bash
   script/add-grammar https://github.com/Lolner95/AIGX
   ```
   (Linguist scans the repo for a grammar whose scope is `source.aigx` and vendors it into
   `vendor/grammars` + `grammars.yml`.)
4. **Add samples** — copy [`sample.aigx`](sample.aigx) (and ideally one or two more real genome files,
   e.g. from `examples/sourcing-app/.aigx/`) into `samples/AIGX/`.
5. **Verify**:
   ```bash
   bundle exec rake test
   script/licensed   # license metadata for the vendored grammar
   ```
6. Open the PR against `github-linguist/linguist` describing AIGX, linking the spec
   (<https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.md>) and adoption.

## Why `type: data`?

AIGX is structured markup consumed as configuration/context (not a programming language and not prose),
so it is typed `data` — the same family as XML, YAML, and JSON — with XML editor modes for highlighting.
