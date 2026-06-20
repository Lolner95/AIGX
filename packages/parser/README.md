# @aigx/parser

The reference parser for **AIGX — AI Genome Exchange** genomes. Zero dependencies, Node 18+. Pure
text-in / data-out functions plus a few filesystem conveniences. The data model it produces matches
[`standard/AIGX-1.1.schema.json`](https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.schema.json).

```bash
npm install @aigx/parser
```

## Usage

```js
import { parseGenome, resolveFile, parseRules, parseFiles } from '@aigx/parser'

// Parse a whole repository into the canonical model
const model = parseGenome(process.cwd())
//  → { aigxVersion: '1.1', root, genomes: [ { dir, protocol, product, rules, files, domainCards } ] }

// Resolve one file's boundary (role, forbid, gotcha, checks)
const entry = resolveFile(model, 'src/features/auth/login.ts')

// Or parse raw text without touching the filesystem
const rules = parseRules('<aigx-architecture><rule id="ARCH-1">…</rule></aigx-architecture>')
const files = parseFiles('<aigx-files><file path="a.ts"><check>ARCH-1</check></file></aigx-files>')
```

## API

| Function | Returns |
|---|---|
| `parseGenome(root)` | `{ aigxVersion, root, genomes[] }` — the full canonical model |
| `parseGenomeDir(dir, root?)` | one genome object |
| `findGenomeDirs(root)` | array of `.aigx/` directory paths |
| `parseRules(text)` | `[{ id, concern, text }]` |
| `parseFiles(text)` | `[{ path, domain, role, forbid, gotcha, checks }]` |
| `parseFileBlock(block)` | one file entry, or `null` |
| `parseProtocol(text)` | `{ version, readFirst, steps[] }` |
| `parseProduct(text)` | `{ name, standard, freshness, stack }` |
| `resolveFile(model, path)` | the matching entry (with `genome`), or `null` |
| `stripComments(text)` | text with XML comments removed |

All functions are zero-dependency and side-effect free except `parseGenome`, `parseGenomeDir`, and
`findGenomeDirs`, which read the filesystem.

## License

MIT © Grégory Parisotto
