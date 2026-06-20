# @aigx/lint

Programmatic validator for **AIGX — AI Genome Exchange** genomes. Implements the conformance-validator
requirements (V1–V7) of the [AIGX 1.1 spec](https://github.com/Lolner95/AIGX/blob/main/standard/conformance.md).
Built on [`@aigx/parser`](https://www.npmjs.com/package/@aigx/parser).

```bash
npm install @aigx/lint
```

For a command-line tool, use [`aigx`](https://www.npmjs.com/package/aigx) (`aigx lint`). This package is the
library you embed in your own tooling, CI scripts, or editor extensions.

## Usage

```js
import { lint, conformance } from '@aigx/lint'

const result = lint(process.cwd(), { ignores: ['examples', 'site'] })
//  → { ok, errors[], warnings[], stats: { genomes, rules, fileEntries, forbidPercent } }

if (!result.ok) {
  for (const e of result.errors) console.error(e)
  process.exit(1)
}

// Per-genome conformance level (0 non-conforming, 1 conforming, 2 recommended)
for (const g of conformance(process.cwd())) {
  console.log(`${g.dir}: level ${g.level}`)
}
```

## What `lint` checks

| Check | Severity |
|---|---|
| Required files exist (`protocol.aigx`, ≥1 concern file, `files.aigx`) | error |
| Every `<check>` id resolves to a real `<rule id>` | error |
| Every `<file path>` exists on disk | error |
| No duplicate rule ids | error |
| No `<file path>` escapes the repository root | error |
| Duplicate `<file>` entries; high `<forbid>` density | warning |

## License

MIT © Grégory Parisotto
