#!/usr/bin/env node
/**
 * create-aigx — scaffold a complete AIGX genome + all agent integrations.
 * Zero external dependencies. Node 18+.
 *
 * Usage:
 *   npx create-aigx              scaffold everything (recommended)
 *   npx create-aigx --aigx-only  scaffold .aigx/ only, skip integration files
 *   npx create-aigx --force      overwrite existing files
 *   npx create-aigx --help
 */
import {
  existsSync, mkdirSync, copyFileSync, readdirSync,
  readFileSync, writeFileSync, appendFileSync
} from 'node:fs'
import { join, resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { argv, exit, stdout } from 'node:process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TMPL      = join(__dirname, '..', 'template')
const TMPL_AIGX = join(TMPL, 'aigx')
const TMPL_INT  = join(TMPL, 'integrations')

// ── ANSI helpers (respects NO_COLOR / non-TTY) ─────────────────────────────────
const NO_COLOR = !stdout.isTTY || !!process.env.NO_COLOR
const c = (code, s) => NO_COLOR ? s : `\x1b[${code}m${s}\x1b[0m`
const bold   = s => c('1',  s)
const dim    = s => c('2',  s)
const green  = s => c('32', s)
const cyan   = s => c('36', s)
const yellow = s => c('33', s)
const blue   = s => c('34', s)
const gray   = s => c('90', s)

// ── Args ───────────────────────────────────────────────────────────────────────
const args     = argv.slice(2)
const force    = args.includes('--force')
const help     = args.includes('--help') || args.includes('-h')
const aigxOnly = args.includes('--aigx-only')

if (help) {
  console.log(`
  ${bold('create-aigx')} — scaffold an AIGX genome + agent integrations

  ${bold('Usage')}
    npx create-aigx              scaffold .aigx/ + all integrations (recommended)
    npx create-aigx --aigx-only  scaffold .aigx/ only
    npx create-aigx --force      overwrite existing files
    npx create-aigx --help

  ${bold('What gets created')}

    ${bold('.aigx/')}
      protocol.aigx        read protocol — the first thing an agent reads
      product.aigx         product context + freshness clause
      architecture.aigx    per-concern rules with semantic ids (ARCH-*)
      engineering.aigx     hard-correctness invariants (ENG-*)
      files.aigx           per-file boundary index  — fill this in
      agent.aigx           self-maintenance rules — keeps the genome current

    ${bold('Integrations')} (unless --aigx-only)
      .cursor/rules/aigx.mdc             Cursor — alwaysApply MDC rule
      CLAUDE.md                           Claude Code — aigx section appended
      .github/copilot-instructions.md    GitHub Copilot
      .github/workflows/aigx-validate.yml CI — validates genome on push/PR
      .windsurfrules                      Windsurf

  ${bold('Docs')}
    Spec         https://github.com/Lolner95/AIGX/blob/main/SPEC.md
    Guide        https://github.com/Lolner95/AIGX/blob/main/docs/authoring-guide.md
    Migrate      https://github.com/Lolner95/AIGX/blob/main/docs/migration.md
    Integrations https://github.com/Lolner95/AIGX/blob/main/integrations/README.md
`)
  exit(0)
}

// ── State ─────────────────────────────────────────────────────────────────────
const cwd      = resolve('.')
const created  = []
const appended = []
const skipped  = []

function rel(p) { return relative(cwd, p).replace(/\\/g, '/') }

function copyFile(src, dest) {
  if (!existsSync(src)) return
  const dir = dirname(dest)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (existsSync(dest) && !force) { skipped.push(dest); return }
  copyFileSync(src, dest)
  created.push(dest)
}

// ── 1. Scaffold .aigx/ ────────────────────────────────────────────────────────
const aigxDir   = join(cwd, '.aigx')
const aigxSrc   = existsSync(TMPL_AIGX) ? TMPL_AIGX : TMPL
const aigxFiles = readdirSync(aigxSrc).filter(f => f.endsWith('.aigx')).sort()

mkdirSync(aigxDir, { recursive: true })
for (const f of aigxFiles) {
  copyFile(join(aigxSrc, f), join(aigxDir, f))
}

// ── 2. Integrations ────────────────────────────────────────────────────────────
if (!aigxOnly && existsSync(TMPL_INT)) {
  // Cursor
  copyFile(
    join(TMPL_INT, 'cursor-aigx.mdc'),
    join(cwd, '.cursor', 'rules', 'aigx.mdc')
  )

  // Claude Code — create if missing, append if file exists without aigx
  const claudeMd  = join(cwd, 'CLAUDE.md')
  const claudeSrc = join(TMPL_INT, 'claude-code.md')
  if (existsSync(claudeSrc)) {
    const snippet = readFileSync(claudeSrc, 'utf8')
    if (!existsSync(claudeMd)) {
      writeFileSync(claudeMd, snippet, 'utf8')
      created.push(claudeMd)
    } else {
      const existing = readFileSync(claudeMd, 'utf8')
      if (!existing.toLowerCase().includes('aigx')) {
        appendFileSync(claudeMd, '\n---\n\n' + snippet, 'utf8')
        appended.push(claudeMd)
      } else {
        skipped.push(claudeMd)
      }
    }
  }

  // GitHub Copilot
  copyFile(
    join(TMPL_INT, 'copilot-instructions.md'),
    join(cwd, '.github', 'copilot-instructions.md')
  )

  // GitHub Actions CI
  copyFile(
    join(TMPL_INT, 'aigx-validate.yml'),
    join(cwd, '.github', 'workflows', 'aigx-validate.yml')
  )

  // Windsurf
  copyFile(
    join(TMPL_INT, 'windsurfrules'),
    join(cwd, '.windsurfrules')
  )
}

// ── 3. Output ──────────────────────────────────────────────────────────────────
const allCreated  = created.map(p  => `  ${green('v')} ${cyan(rel(p))}`)
const allAppended = appended.map(p => `  ${blue('+')} ${cyan(rel(p))}  ${gray('<-- aigx section appended')}`)
const skipNote    = skipped.length
  ? `\n  ${yellow('!')} ${skipped.length} file(s) skipped (already exist -- use ${cyan('--force')} to overwrite)`
  : ''

console.log(`
  ${bold('AIGX')}  ${dim('AI Genome Exchange')}

${[...allCreated, ...allAppended].join('\n')}${skipNote}

  ${bold('Three things to fill in:')}

  ${bold('1.')} ${cyan('.aigx/files.aigx')}  ${dim('<-- the keystone')}
       One <file> entry per source file your agent will realistically edit.
       Each entry: role + optional forbid + one gotcha + check ids.

  ${bold('2.')} ${cyan('.aigx/architecture.aigx')}
       Replace the TODO rules with your actual architecture rules.
       Use semantic ids (ARCH-no-deep-imports) -- check lists become self-documenting.

  ${bold('3.')} ${cyan('.aigx/product.aigx')}
       Fill in product name, quality standard, freshness clause, and stack.

  ${bold('Validate at any time:')}
    ${dim('python tools/aigx-lint/aigx_lint.py --root .')}

  ${bold('Full guide')}    ${dim('https://github.com/Lolner95/AIGX/blob/main/docs/authoring-guide.md')}
  ${bold('Integrations')} ${dim('https://github.com/Lolner95/AIGX/blob/main/integrations/README.md')}
`)
