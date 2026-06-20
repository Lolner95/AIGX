#!/usr/bin/env node
/**
 * create-aigx — scaffold a complete AIGX genome + the agent integrations you choose.
 * Zero external dependencies. Node 18+.
 *
 *   npx create-aigx                 interactive: pick your agent(s), then scaffold
 *   npx create-aigx --yes           non-interactive: scaffold .aigx/ + every integration
 *   npx create-aigx --cursor --claude   pick agents by flag (implies non-interactive)
 *   npx create-aigx --aigx-only     just the .aigx/ genome, no integrations
 *   npx create-aigx --no-ci         skip the GitHub Action
 *   npx create-aigx --force         overwrite existing files
 *   npx create-aigx --help
 */
import {
  existsSync, mkdirSync, copyFileSync, readdirSync,
  readFileSync, writeFileSync, appendFileSync
} from 'node:fs'
import { join, resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { argv, exit, stdout, stdin, env } from 'node:process'
import { createInterface } from 'node:readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TMPL = join(__dirname, '..', 'template')
const TMPL_AIGX = join(TMPL, 'aigx')
const TMPL_INT = join(TMPL, 'integrations')

// ── color + style ───────────────────────────────────────────────────────────
const COLOR = stdout.isTTY && !env.NO_COLOR
const sgr = (c, s) => COLOR ? `\x1b[${c}m${s}\x1b[0m` : s
const bold = s => sgr('1', s), dim = s => sgr('2', s), ital = s => sgr('3', s)
const rgb = ([r, g, b], s) => COLOR ? `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m` : s
const GREEN = [34, 197, 94], BLUE = [59, 130, 246], PURPLE = [139, 92, 246], AMBER = [245, 158, 11]
const STOPS = [GREEN, BLUE, PURPLE, AMBER]
const lerp = (a, b, t) => Math.round(a + (b - a) * t)
const at = t => {
  const seg = Math.min(STOPS.length - 2, Math.floor(t * (STOPS.length - 1)))
  const lt = t * (STOPS.length - 1) - seg
  return STOPS[seg].map((c, i) => lerp(c, STOPS[seg + 1][i], lt))
}
const gradient = s => {
  const ch = [...s]; const n = Math.max(1, ch.length - 1)
  return ch.map((c, i) => c === ' ' ? c : rgb(at(i / n), c)).join('')
}
const ok = rgb(GREEN, '✔'), arrow = rgb(BLUE, '→'), star = rgb(AMBER, '★')

function banner() {
  stdout.write(`
  🧬  ${bold(gradient('A  I  G  X'))}   ${dim('·  AI Genome Exchange')}
  ${dim('the genome of your codebase, for AI coding agents')}
  ${dim('─'.repeat(52))}
`)
}

// ── args ──────────────────────────────────────────────────────────────────────
const args = argv.slice(2)
const has = (...f) => f.some(x => args.includes(x))
const force = has('--force', '-f')
const help = has('--help', '-h')
const aigxOnly = has('--aigx-only')
const noCi = has('--no-ci')
const yes = has('--yes', '-y')

const AGENTS = [
  { key: 'cursor',   label: 'Cursor',              flag: '--cursor',   tmpl: 'cursor-aigx.mdc',          dest: '.cursor/rules/aigx.mdc' },
  { key: 'claude',   label: 'Claude Code',         flag: '--claude',   tmpl: 'claude-code.md',           dest: 'CLAUDE.md', append: true },
  { key: 'copilot',  label: 'GitHub Copilot',      flag: '--copilot',  tmpl: 'copilot-instructions.md',  dest: '.github/copilot-instructions.md' },
  { key: 'windsurf', label: 'Windsurf',            flag: '--windsurf', tmpl: 'windsurfrules',            dest: '.windsurfrules' },
  { key: 'aider',    label: 'Aider',               flag: '--aider',    tmpl: 'aider.conf.yml',           dest: '.aider.conf.yml' },
  { key: 'agents',   label: 'AGENTS.md (generic)', flag: '--agents',   tmpl: 'AGENTS.md',                dest: 'AGENTS.md', append: true }
]

if (help) {
  banner()
  stdout.write(`  ${bold('Usage')}
    ${rgb(BLUE, 'npx create-aigx')}                 ${dim('interactive — pick your agent(s)')}
    ${rgb(BLUE, 'npx create-aigx --yes')}           ${dim('scaffold .aigx/ + every integration')}
    ${rgb(BLUE, 'npx create-aigx --cursor')}        ${dim('pick agents by flag (--claude --copilot …)')}
    ${rgb(BLUE, 'npx create-aigx --aigx-only')}     ${dim('just the .aigx/ genome')}

  ${bold('Flags')}  --force  --no-ci  --aigx-only  --yes  --help
  ${bold('Docs')}   ${dim('https://github.com/Lolner95/AIGX')}
`)
  exit(0)
}

// ── scaffolding ─────────────────────────────────────────────────────────────
const cwd = resolve('.')
const created = [], appended = [], skipped = []
const rel = p => relative(cwd, p).replace(/\\/g, '/')

function copyFile(src, dest) {
  if (!existsSync(src)) return
  mkdirSync(dirname(dest), { recursive: true })
  if (existsSync(dest) && !force) { skipped.push(dest); return }
  copyFileSync(src, dest); created.push(dest)
}
function placeIntegration(a) {
  const src = join(TMPL_INT, a.tmpl), dest = join(cwd, a.dest)
  if (!existsSync(src)) return
  if (a.append && existsSync(dest)) {
    const cur = readFileSync(dest, 'utf8')
    if (cur.toLowerCase().includes('aigx')) { skipped.push(dest); return }
    appendFileSync(dest, '\n---\n\n' + readFileSync(src, 'utf8'), 'utf8')
    appended.push(dest); return
  }
  copyFile(src, dest)
}

function scaffold(chosen, withCi) {
  // 1) the genome
  const aigxDir = join(cwd, '.aigx')
  const aigxSrc = existsSync(TMPL_AIGX) ? TMPL_AIGX : TMPL
  mkdirSync(aigxDir, { recursive: true })
  for (const f of readdirSync(aigxSrc).filter(f => f.endsWith('.aigx')).sort()) {
    copyFile(join(aigxSrc, f), join(aigxDir, f))
  }
  // 2) chosen integrations
  for (const a of chosen) placeIntegration(a)
  // 3) CI
  if (withCi) copyFile(join(TMPL_INT, 'aigx-validate.yml'), join(cwd, '.github', 'workflows', 'aigx-validate.yml'))
}

// ── interactive prompts ───────────────────────────────────────────────────────
const ask = (rl, q) => new Promise(res => rl.question(q, res))

function parseSelection(input) {
  const s = input.trim().toLowerCase()
  if (s === '' || s === 'a' || s === 'all') return AGENTS.slice()
  const picked = new Set()
  for (const tok of s.split(/[\s,]+/).filter(Boolean)) {
    const range = tok.match(/^(\d+)-(\d+)$/)
    if (range) { for (let i = +range[1]; i <= +range[2]; i++) if (AGENTS[i - 1]) picked.add(AGENTS[i - 1]) }
    else if (/^\d+$/.test(tok)) { if (AGENTS[+tok - 1]) picked.add(AGENTS[+tok - 1]) }
    else { const a = AGENTS.find(x => x.key === tok); if (a) picked.add(a) }
  }
  return [...picked]
}

async function interactiveChoose() {
  const rl = createInterface({ input: stdin, output: stdout })
  stdout.write(`  ${bold('Which agent(s) should inherit the genome?')}\n\n`)
  AGENTS.forEach((a, i) => stdout.write(`    ${rgb(BLUE, `[${i + 1}]`)} ${bold(a.label)}\n`))
  stdout.write(`\n  ${dim("type numbers (e.g. ")}${'1 2'}${dim("), a range (")}${'1-4'}${dim("), or ")}${bold('all')}${dim(" — Enter = all")}\n`)
  const sel = await ask(rl, `  ${arrow} `)
  let chosen = aigxOnly ? [] : parseSelection(sel)

  let withCi = !noCi
  if (!aigxOnly) {
    const ci = await ask(rl, `\n  ${bold('Add a GitHub Action to validate the genome in CI?')} ${dim('[Y/n]')} ${arrow} `)
    withCi = !/^n/i.test(ci.trim())
  }
  rl.close()
  return { chosen, withCi }
}

// ── output ────────────────────────────────────────────────────────────────────
function summary() {
  const group = (title, items) => {
    if (!items.length) return ''
    return `\n  ${bold(title)}\n` + items.map(p => `    ${ok} ${rgb(BLUE, rel(p))}`).join('\n') + '\n'
  }
  stdout.write(group('Genome', created.filter(p => rel(p).startsWith('.aigx/'))))
  const intg = created.filter(p => !rel(p).startsWith('.aigx/'))
  if (intg.length || appended.length) {
    stdout.write(`\n  ${bold('Integrations')}\n`)
    intg.forEach(p => stdout.write(`    ${ok} ${rgb(BLUE, rel(p))}\n`))
    appended.forEach(p => stdout.write(`    ${rgb(AMBER, '+')} ${rgb(BLUE, rel(p))} ${dim('(aigx section appended)')}\n`))
  }
  if (skipped.length) stdout.write(`\n  ${dim(`↷ ${skipped.length} existing file(s) left untouched — use `)}${rgb(AMBER, '--force')}${dim(' to overwrite')}\n`)

  stdout.write(`
  ${dim('─'.repeat(46))}
  ${star} ${bold('Three things to make it yours:')}

    ${rgb(GREEN, '1.')} ${bold('.aigx/files.aigx')}        ${dim('← the keystone')}
       one ${rgb(BLUE, '<file>')} entry per file an agent will edit:
       role · optional forbid · one gotcha · check ids
    ${rgb(GREEN, '2.')} ${bold('.aigx/architecture.aigx')}  replace the TODO rules with yours
    ${rgb(GREEN, '3.')} ${bold('.aigx/product.aigx')}       product, quality bar, freshness clause

  ${star} ${bold('Then verify the genome:')}
       ${rgb(BLUE, 'npx @aigx/cli lint')}   ${dim('(or  pip install aigx · cargo install aigx)')}

  ${dim('60-second guide')}  ${rgb(PURPLE, 'https://github.com/Lolner95/AIGX/blob/main/docs/aigx-in-60-seconds.md')}
  ${dim('full spec     ')}  ${rgb(PURPLE, 'https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.md')}

  ${gradient('Hand an agent your genome and it behaves like a senior engineer who knows your code.')} 🧬
`)
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  banner()

  const flagged = AGENTS.filter(a => args.includes(a.flag))
  const interactive = stdin.isTTY && stdout.isTTY && !yes && !aigxOnly && flagged.length === 0

  let chosen, withCi
  if (aigxOnly) { chosen = []; withCi = false }
  else if (flagged.length) { chosen = flagged; withCi = !noCi }
  else if (interactive) { ({ chosen, withCi } = await interactiveChoose()) }
  else { chosen = AGENTS.slice(); withCi = !noCi } // --yes / piped / CI → everything

  if (!aigxOnly) {
    const names = chosen.length ? chosen.map(a => a.label).join(', ') : 'none'
    stdout.write(`\n  ${dim('scaffolding')} ${bold('.aigx/')} ${dim('+ integrations:')} ${names}${withCi ? dim(' + CI') : ''}\n`)
  }
  scaffold(chosen, withCi)
  summary()
  return 0
}

main().then(c => exit(c)).catch(e => { console.error(e); exit(1) })
