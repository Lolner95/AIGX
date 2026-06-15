#!/usr/bin/env node
/**
 * create-aigx — scaffold an AIGX genome into your project.
 * Zero external dependencies. Node 18+.
 *
 * Usage:
 *   npx create-aigx           scaffold .aigx/ in the current directory
 *   npx create-aigx --force   overwrite an existing .aigx/ directory
 *   npx create-aigx --help
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { argv, exit, stdout } from 'node:process'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── ANSI helpers (respects NO_COLOR env var) ───────────────────────────────────
const NO_COLOR = !stdout.isTTY || !!process.env.NO_COLOR
const c = (code, s) => NO_COLOR ? s : `\x1b[${code}m${s}\x1b[0m`
const bold   = s => c('1',  s)
const dim    = s => c('2',  s)
const green  = s => c('32', s)
const cyan   = s => c('36', s)
const yellow = s => c('33', s)

// ── Parse args ─────────────────────────────────────────────────────────────────
const args  = argv.slice(2)
const force = args.includes('--force')
const help  = args.includes('--help') || args.includes('-h')

if (help) {
  console.log(`
  ${bold('create-aigx')} — scaffold an AIGX genome into your project

  ${bold('Usage')}
    npx create-aigx            scaffold .aigx/ in the current directory
    npx create-aigx --force    overwrite an existing .aigx/ directory

  ${bold('What gets created')}
    .aigx/protocol.aigx        read protocol — the first thing an agent reads
    .aigx/product.aigx         product context + freshness clause
    .aigx/architecture.aigx    per-concern rules (ARCH-* ids)
    .aigx/engineering.aigx     hard-correctness invariants (ENG-* ids)
    .aigx/files.aigx           per-file boundary index — fill this in

  ${bold('Docs')}
    Spec      https://github.com/Lolner95/AIGX/blob/main/SPEC.md
    Guide     https://github.com/Lolner95/AIGX/blob/main/docs/authoring-guide.md
    Migrate   https://github.com/Lolner95/AIGX/blob/main/docs/migration.md
`)
  exit(0)
}

// ── Target ─────────────────────────────────────────────────────────────────────
const cwd     = resolve('.')
const aigxDir = join(cwd, '.aigx')

if (existsSync(aigxDir) && !force) {
  console.error(`
  ${yellow('!')} ${bold('.aigx/')} already exists in this directory.
    Run with ${cyan('--force')} to overwrite.
`)
  exit(1)
}

// ── Copy template files ────────────────────────────────────────────────────────
const templateDir = join(__dirname, '..', 'template')
const files = readdirSync(templateDir).filter(f => f.endsWith('.aigx')).sort()

mkdirSync(aigxDir, { recursive: true })
for (const file of files) {
  copyFileSync(join(templateDir, file), join(aigxDir, file))
}

// ── Success ────────────────────────────────────────────────────────────────────
const ADDENDUM =
  `This repository uses AIGX - the AI Genome Exchange context format. ` +
  `Read .aigx/protocol.aigx first; for each file you edit, find its <file> entry ` +
  `in .aigx/files.aigx and obey its <forbid> and <check>.`

console.log(`
  ${bold('AIGX')} ${dim('AI Genome Exchange')}

  ${green('✔')} Scaffolded ${cyan('.aigx/')} ${dim('→ ' + cwd)}

${files.map(f => `    ${dim('·')} .aigx/${f}`).join('\n')}

  ${bold('Fill in 3 things and you\'re done:')}

  ${bold('1.')} ${cyan('.aigx/files.aigx')}  ${dim('← the keystone')}
       Add one <file> entry per source file your agent realistically edits.
       Each entry: role + optional forbid + one gotcha + check ids.

  ${bold('2.')} ${cyan('.aigx/architecture.aigx')}  ${dim('← and any other concern files')}
       Replace the TODO rules with your actual rules.
       One sentence per rule. Keep the ARCH-N ids stable.

  ${bold('3.')} Add this line to your ${bold('AGENTS.md')} / ${bold('CLAUDE.md')}:

       ${dim('"' + ADDENDUM + '"')}

  ${bold('Then (optional but recommended):')}

    Run the linter to catch moved/missing files and dangling check ids:
    ${dim('python tools/aigx-lint/aigx_lint.py --root .')}

  ${bold('Full authoring guide')}
    ${dim('https://github.com/Lolner95/AIGX/blob/main/docs/authoring-guide.md')}
`)
