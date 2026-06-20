#!/usr/bin/env node
/**
 * aigx — the AIGX (AI Genome Exchange) command-line tool.
 *
 * Zero external dependencies. Node 18+. Self-contained: implements parsing,
 * validation, resolution, scaffolding, formatting, and conformance checking
 * for AIGX genomes without shelling out to anything.
 *
 * Commands:
 *   aigx init [--minimal] [--force]   scaffold a .aigx/ genome
 *   aigx lint [--root DIR] [--json]   validate the genome(s); non-zero exit on errors
 *   aigx resolve <path> [--root DIR]  print the boundary for one file (O(1) lookup)
 *   aigx doctor [--root DIR]          environment + genome health check
 *   aigx format [--root DIR] [--check] normalize whitespace in .aigx files (parity-safe)
 *   aigx check-conformance [--root DIR]  report conformance level (G1–G4, then §10.2)
 *   aigx --version | --help
 *
 * Spec: https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.md
 */
import {
  existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync
} from 'node:fs'
import { join, resolve, relative, dirname, basename } from 'node:path'
import { argv, exit, stdout, version as nodeVersion, platform } from 'node:process'

const VERSION = '1.2.0'
const SPEC_VERSION = '1.1'

// ── ANSI (respects NO_COLOR / non-TTY) ──────────────────────────────────────
const NO_COLOR = !stdout.isTTY || !!process.env.NO_COLOR
const c = (code, s) => NO_COLOR ? s : `\x1b[${code}m${s}\x1b[0m`
const bold = s => c('1', s), dim = s => c('2', s)
const green = s => c('32', s), red = s => c('31', s)
const yellow = s => c('33', s), cyan = s => c('36', s)
const ok = green('✔'), warn = yellow('!'), bad = red('✖')

// ── Parser primitives (mirror tools/aigx-lint/aigx_lint.py) ──────────────────
const RULE_RE   = /<rule\s+id="([^"]+)"/g
const FILE_BLOCK_RE = /<file\b[^>]*>[\s\S]*?<\/file>/g
const PATH_ATTR_RE = /<file\b[^>]*\bpath="([^"]+)"/
const DOMAIN_ATTR_RE = /<file\b[^>]*\bdomain="([^"]+)"/
const CHECK_RE  = /<check>([\s\S]*?)<\/check>/
const FORBID_RE = /<forbid\b/
const FORBID_TEXT_RE = /<forbid\b([^>]*)>([\s\S]*?)<\/forbid>/
const GOTCHA_TEXT_RE = /<gotcha\b([^>]*)>([\s\S]*?)<\/gotcha>/
const ROLE_TEXT_RE = /<role>([\s\S]*?)<\/role>/
const PRI_ATTR_RE = /\bpri="([^"]+)"/
const COMMENT_RE = /<!--[\s\S]*?-->/g
const ROOT_EL_RE = /<(aigx-[A-Za-z0-9_-]+)\b/
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '__pycache__', '.venv', 'venv'])
const KNOWN_ROOTS = new Set(['aigx-protocol', 'aigx-product', 'aigx-files', 'aigx-domain', 'aigx-agent'])

const toPosix = p => p.replace(/\\/g, '/')
const stripComments = s => s.replace(COMMENT_RE, '')
const tidy = s => s.replace(/\s+/g, ' ').trim()
const read = p => readFileSync(p, 'utf8')

function loadIgnores(root, cliExcludes) {
  // .aigxignore: newline-separated repo-relative dir prefixes; '#' comments. Plus --exclude flags.
  const ig = [...cliExcludes]
  const f = join(root, '.aigxignore')
  if (existsSync(f)) {
    for (const line of read(f).split(/\r?\n/)) {
      const s = line.split('#')[0].trim().replace(/\/+$/, '')
      if (s) ig.push(s)
    }
  }
  return ig.map(toPosix)
}

function findAigxDirs(root, ignores = []) {
  const out = []
  const walk = d => {
    let ents
    try { ents = readdirSync(d, { withFileTypes: true }) } catch { return }
    if (basename(d) === '.aigx') out.push(d)
    for (const e of ents) {
      if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue
      const rel = toPosix(relative(root, join(d, e.name)))
      if (ignores.some(ig => rel === ig || rel.startsWith(ig + '/'))) continue
      walk(join(d, e.name))
    }
  }
  walk(root)
  return out.sort()
}

function priority(attrs) {
  const m = PRI_ATTR_RE.exec(attrs || '')
  return m ? m[1] : null
}

function collectRules(aigxDir) {
  // returns { ids:Set, dups:[ids seen >1], concernOf:Map(id->concern) }
  const ids = new Set(), dups = [], concernOf = new Map()
  for (const fn of readdirSync(aigxDir)) {
    if (!fn.endsWith('.aigx') || fn === 'files.aigx') continue
    const text = stripComments(read(join(aigxDir, fn)))
    const concern = (ROOT_EL_RE.exec(text)?.[1] || fn.replace(/\.aigx$/, '')).replace(/^aigx-/, '')
    let m
    RULE_RE.lastIndex = 0
    while ((m = RULE_RE.exec(text))) {
      const id = m[1]
      if (ids.has(id)) dups.push(id)
      else { ids.add(id); concernOf.set(id, concern) }
    }
  }
  return { ids, dups, concernOf }
}

function parseEntries(filesPath) {
  if (!existsSync(filesPath)) return []
  const text = stripComments(read(filesPath))
  const entries = []
  const blocks = text.match(FILE_BLOCK_RE) || []
  for (const block of blocks) {
    const pm = PATH_ATTR_RE.exec(block)
    if (!pm) continue
    const dm = DOMAIN_ATTR_RE.exec(block)
    let checks = []
    const cm = CHECK_RE.exec(block)
    if (cm) {
      const nested = [...cm[1].matchAll(/id="([^"]+)"/g)].map(x => x[1])
      checks = nested.length ? nested : cm[1].split(/\s+/).filter(Boolean)
    }
    const rm = ROLE_TEXT_RE.exec(block)
    const fm = FORBID_TEXT_RE.exec(block)
    const gm = GOTCHA_TEXT_RE.exec(block)
    entries.push({
      path: pm[1].trim(),
      domain: dm ? dm[1].trim() : null,
      role: rm ? tidy(rm[1]) : null,
      forbid: fm ? { priority: priority(fm[1]), text: tidy(fm[2]) } : null,
      gotcha: gm ? { priority: priority(gm[1]), text: tidy(gm[2]) } : null,
      checks,
      hasForbid: FORBID_RE.test(block),
      block: block.trim()
    })
  }
  return entries
}

function gather(root, ignores = []) {
  const genomes = []
  const allRules = new Set()
  for (const d of findAigxDirs(root, ignores)) {
    const { ids, dups, concernOf } = collectRules(d)
    ids.forEach(i => allRules.add(i))
    genomes.push({ dir: d, rules: ids, dups, concernOf, entries: parseEntries(join(d, 'files.aigx')) })
  }
  return { genomes, allRules }
}

const escapesRoot = p => /(^|\/)\.\.(\/|$)/.test(toPosix(p)) || p.startsWith('/') || /^[A-Za-z]:/.test(p)

// ── command: lint ────────────────────────────────────────────────────────────
function cmdLint(root, json, ignores) {
  const { genomes, allRules } = gather(root, ignores)
  if (!genomes.length) {
    console.error(`${bad} no .aigx/ genome found under ${root}`)
    return 2
  }
  const errors = [], warnings = []
  const seenPaths = new Map()
  let nEntries = 0, nForbid = 0

  for (const g of genomes) {
    const rel = toPosix(relative(root, g.dir)) || '.aigx'
    for (const id of g.dups) errors.push(`[${rel}] duplicate <rule id="${id}"> (rule ids MUST be unique)`)
    // required: at least one concern rule
    if (g.rules.size === 0) errors.push(`[${rel}] no <rule id> found in any concern file (need ≥1)`)
    // required: protocol.aigx
    if (!existsSync(join(g.dir, 'protocol.aigx'))) errors.push(`[${rel}] missing required protocol.aigx`)
    // required: files.aigx with ≥1 entry
    if (!existsSync(join(g.dir, 'files.aigx'))) errors.push(`[${rel}] missing required files.aigx`)
    else if (g.entries.length === 0) errors.push(`[${rel}] files.aigx has no <file> entries (need ≥1)`)

    for (const e of g.entries) {
      nEntries++
      if (e.hasForbid) nForbid++
      if (escapesRoot(e.path)) {
        errors.push(`[${rel}] <file path="${e.path}"> escapes the repository root (forbidden, security S2)`)
        continue
      }
      if (!existsSync(join(root, e.path)))
        errors.push(`[${rel}] file entry path does not exist: ${e.path} (stale/renamed entry)`)
      for (const cid of e.checks)
        if (!allRules.has(cid))
          errors.push(`[${rel}] <check> id '${cid}' (in ${e.path}) does not resolve to any <rule id>`)
      if (seenPaths.has(e.path))
        warnings.push(`duplicate <file> entry for ${e.path} (in ${rel} and ${seenPaths.get(e.path)})`)
      else seenPaths.set(e.path, rel)
    }
    // unknown aigx-* root element (V7)
    for (const fn of readdirSync(g.dir)) {
      if (!fn.endsWith('.aigx')) continue
      const m = ROOT_EL_RE.exec(stripComments(read(join(g.dir, fn))))
      if (m && !KNOWN_ROOTS.has(m[1]) && !m[1].startsWith('aigx-')) continue
      if (m && !KNOWN_ROOTS.has(m[1]) && fn !== 'files.aigx' &&
          !/^aigx-[a-z]/.test(m[1])) warnings.push(`[${rel}] unknown root element <${m[1]}> in ${fn}`)
    }
  }
  const forbidPct = nEntries ? Math.round(100 * nForbid / nEntries) : 0
  if (forbidPct > 40)
    warnings.push(`<forbid> density is ${forbidPct}% of entries — scarcity preserves salience (spec §10.2)`)

  const status = errors.length ? 'FAIL' : 'ok'
  if (json) {
    console.log(JSON.stringify({
      ok: !errors.length, status, genomes: genomes.length,
      rules: allRules.size, fileEntries: nEntries, forbidPercent: forbidPct,
      errors, warnings
    }, null, 2))
  } else {
    for (const w of warnings) console.log(`  ${warn} warning: ${w}`)
    for (const er of errors) console.log(`  ${bad} error:   ${er}`)
    const tag = errors.length ? red(status) : green(status)
    console.log(`\naigx lint: ${genomes.length} genome(s), ${allRules.size} rules, ${nEntries} file entries → ${tag} (${errors.length} error(s), ${warnings.length} warning(s))`)
  }
  return errors.length ? 1 : 0
}

// ── command: resolve ───────────────────────────────────────────────────────
function cmdResolve(root, target, json, ignores) {
  const t = toPosix(target).replace(/^\.\//, '')
  const { genomes } = gather(root, ignores)
  for (const g of genomes) {
    for (const e of g.entries) {
      if (toPosix(e.path) === t) {
        if (json) { console.log(JSON.stringify({ found: true, ...e }, null, 2)); return 0 }
        const rel = toPosix(relative(root, g.dir)) || '.aigx'
        console.log(`${bold('Applicable genome:')} ${rel}`)
        if (e.role)   console.log(`${bold('Role:')}   ${e.role}`)
        if (e.forbid) console.log(`${bold('Forbid:')} ${e.forbid.text}${e.forbid.priority ? '  ' + red('[' + e.forbid.priority + ']') : ''}`)
        if (e.gotcha) console.log(`${bold('Gotcha:')} ${e.gotcha.text}`)
        if (e.checks.length) console.log(`${bold('Checks:')} ${e.checks.join(', ')}`)
        return 0
      }
    }
  }
  const exists = existsSync(join(root, t))
  if (json) console.log(JSON.stringify({ found: false, path: t, exists }, null, 2))
  else console.log(`${dim('aigx resolve:')} no <file> entry for '${t}'${exists ? '' : ' (and the file does not exist)'}`)
  return exists ? 0 : 2
}

// ── command: init ──────────────────────────────────────────────────────────
function cmdInit(cwd, minimal, force) {
  const dir = join(cwd, '.aigx')
  mkdirSync(dir, { recursive: true })
  const set = minimal
    ? { 'protocol.aigx': T_PROTOCOL, 'architecture.aigx': T_ARCH, 'files.aigx': T_FILES }
    : { 'protocol.aigx': T_PROTOCOL, 'product.aigx': T_PRODUCT, 'architecture.aigx': T_ARCH,
        'engineering.aigx': T_ENG, 'files.aigx': T_FILES, 'agent.aigx': T_AGENT }
  const made = [], skipped = []
  for (const [fn, body] of Object.entries(set)) {
    const p = join(dir, fn)
    if (existsSync(p) && !force) { skipped.push(fn); continue }
    writeFileSync(p, body, 'utf8'); made.push(fn)
  }
  console.log(`\n  ${bold('AIGX')} ${dim('AI Genome Exchange')}\n`)
  for (const fn of made) console.log(`  ${ok} .aigx/${cyan(fn)}`)
  if (skipped.length) console.log(`\n  ${warn} skipped (exist): ${skipped.join(', ')} — use ${cyan('--force')} to overwrite`)
  console.log(`\n  Next: fill in ${cyan('.aigx/files.aigx')}, then run ${cyan('aigx lint')}.`)
  console.log(`  Guide: ${dim('https://github.com/Lolner95/AIGX/blob/main/docs/aigx-in-60-seconds.md')}\n`)
  return 0
}

// ── command: doctor ──────────────────────────────────────────────────────────
function cmdDoctor(root, ignores) {
  console.log(`\n  ${bold('aigx doctor')}  ${dim('— environment + genome health')}\n`)
  const line = (s, label, extra = '') => console.log(`  ${s} ${label}${extra ? '  ' + dim(extra) : ''}`)
  line(ok, `Node ${nodeVersion}`, platform)
  const dirs = findAigxDirs(root, ignores)
  if (!dirs.length) {
    line(bad, 'no .aigx/ genome found', `run ${'aigx init'} to scaffold one`)
    console.log()
    return 1
  }
  line(ok, `${dirs.length} genome director${dirs.length === 1 ? 'y' : 'ies'} found`)
  let issues = 0
  for (const d of dirs) {
    const rel = toPosix(relative(root, d)) || '.aigx'
    for (const req of ['protocol.aigx', 'files.aigx']) {
      if (existsSync(join(d, req))) line(ok, `${rel}/${req}`)
      else { line(bad, `${rel}/${req} missing`); issues++ }
    }
    const hasConcern = readdirSync(d).some(f => f.endsWith('.aigx') && f !== 'files.aigx' && f !== 'protocol.aigx' && f !== 'product.aigx' && f !== 'agent.aigx' && RULE_RE.test(read(join(d, f))))
    if (hasConcern) line(ok, `${rel} has ≥1 concern file with rules`)
    else { line(warn, `${rel} has no concern file with <rule id> — add architecture.aigx`); issues++ }
  }
  // git hook?
  const hook = join(root, '.git', 'hooks', 'pre-commit')
  if (existsSync(hook) && /aigx/i.test(read(hook))) line(ok, 'aigx-sync pre-commit hook installed')
  else line(warn, 'aigx-sync pre-commit hook not installed', 'optional: prevents stale paths on rename')
  // run lint quietly
  console.log()
  const code = cmdLint(root, false, ignores)
  console.log(`\n  ${code === 0 && issues === 0 ? green('Healthy.') : yellow('See items above.')}\n`)
  return code === 0 && issues === 0 ? 0 : 1
}

// ── command: format ──────────────────────────────────────────────────────────
function normalize(text) {
  // parity-safe: trim trailing ws per line, collapse 3+ blank lines, single trailing newline
  const out = text.replace(/[ \t]+(\r?\n)/g, '$1').replace(/(\r?\n){3,}/g, '\n\n').replace(/\s*$/, '') + '\n'
  return out
}
function cmdFormat(root, check, ignores) {
  const dirs = findAigxDirs(root, ignores)
  if (!dirs.length) { console.error(`${bad} no .aigx/ genome found under ${root}`); return 2 }
  const changed = []
  for (const d of dirs) for (const fn of readdirSync(d)) {
    if (!fn.endsWith('.aigx')) continue
    const p = join(d, fn), before = read(p), after = normalize(before)
    if (before !== after) {
      changed.push(toPosix(relative(root, p)))
      if (!check) writeFileSync(p, after, 'utf8')
    }
  }
  if (!changed.length) { console.log(`  ${ok} all .aigx files already normalized`); return 0 }
  for (const f of changed) console.log(`  ${check ? warn : ok} ${check ? 'would format' : 'formatted'} ${cyan(f)}`)
  if (check) { console.log(`\n  ${bad} ${changed.length} file(s) need formatting (run ${cyan('aigx format')})`); return 1 }
  console.log(`\n  ${ok} formatted ${changed.length} file(s)`)
  return 0
}

// ── command: check-conformance ───────────────────────────────────────────────
function cmdConformance(root, ignores) {
  const { genomes, allRules } = gather(root, ignores)
  if (!genomes.length) { console.error(`${bad} no .aigx/ genome found under ${root}`); return 2 }
  console.log(`\n  ${bold('aigx check-conformance')}  ${dim('— AIGX ' + SPEC_VERSION)}\n`)
  let worstLevel = 2, anyFail = false
  for (const g of genomes) {
    const rel = toPosix(relative(root, g.dir)) || '.aigx'
    const g1 = existsSync(join(g.dir, 'protocol.aigx'))
    const g2 = g.rules.size > 0 && g.dups.length === 0
    const g3 = g.entries.length > 0
    const g4 = g.entries.every(e => e.checks.every(c => allRules.has(c)))
    const conforms = g1 && g2 && g3 && g4
    // Level 2 (recommended) checks
    const hasFreshness = existsSync(join(g.dir, 'product.aigx')) && /<freshness>/.test(read(join(g.dir, 'product.aigx')))
    const nForbid = g.entries.filter(e => e.hasForbid).length
    const forbidScarce = g.entries.length ? (nForbid / g.entries.length) <= 0.4 : true
    const oneGotcha = g.entries.every(e => (e.block.match(/<gotcha\b/g) || []).length <= 1)
    const level2 = conforms && hasFreshness && forbidScarce && oneGotcha
    const level = !conforms ? 0 : (level2 ? 2 : 1)
    if (level < worstLevel) worstLevel = level
    if (!conforms) anyFail = true

    console.log(`  ${bold(rel)}`)
    console.log(`    ${g1 ? ok : bad} G1 protocol.aigx instructs per-file lookup`)
    console.log(`    ${g2 ? ok : bad} G2 ≥1 concern file with unique rule ids`)
    console.log(`    ${g3 ? ok : bad} G3 files.aigx has ≥1 <file> entry`)
    console.log(`    ${g4 ? ok : bad} G4 every <check> id resolves`)
    console.log(`    ${dim('recommended:')} ${hasFreshness ? ok : warn} freshness  ${forbidScarce ? ok : warn} forbid-scarcity  ${oneGotcha ? ok : warn} one-gotcha`)
    console.log(`    → ${level === 0 ? red('NON-CONFORMING') : level === 2 ? green('Level 2 (Recommended)') : yellow('Level 1 (Conforming)')}\n`)
  }
  console.log(`  Overall: ${anyFail ? red('NON-CONFORMING') : worstLevel === 2 ? green('Level 2 (Recommended)') : yellow('Level 1 (Conforming)')}\n`)
  return anyFail ? 1 : 0
}

// ── help / version ───────────────────────────────────────────────────────────
function help() {
  console.log(`
  ${bold('aigx')} ${dim('v' + VERSION)} — AI Genome Exchange CLI ${dim('(spec ' + SPEC_VERSION + ')')}

  ${bold('Usage')}
    aigx <command> [options]

  ${bold('Commands')}
    ${cyan('init')} [--minimal] [--force]     scaffold a .aigx/ genome in the current directory
    ${cyan('lint')} [--root DIR] [--json]      validate genome(s); non-zero exit on errors
    ${cyan('resolve')} <path> [--root DIR]     print the boundary for one file (O(1) lookup)
    ${cyan('doctor')} [--root DIR]             environment + genome health check
    ${cyan('format')} [--root DIR] [--check]   normalize whitespace in .aigx files (parity-safe)
    ${cyan('check-conformance')} [--root DIR]  report conformance level (G1–G4, then §10.2)

  ${bold('Global')}
    --root DIR        repository root (default: current directory)
    --exclude DIR     skip a nested genome dir (repeatable); also reads .aigxignore
    --version, -v     print version
    --help, -h        print this help

  ${bold('What lint checks')}
    required files exist · all <check> ids resolve · all paths exist
    no duplicate rule ids · no stale entries · no path escapes the repo root

  ${bold('Docs')}  ${dim('https://github.com/Lolner95/AIGX')}
  ${bold('Spec')}  ${dim('https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.md')}
`)
}

// ── dispatch ───────────────────────────────────────────────────────────────
function getFlagValue(args, name) {
  const i = args.indexOf(name)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null
}
function getAllFlagValues(args, name) {
  const out = []
  for (let i = 0; i < args.length; i++) if (args[i] === name && i + 1 < args.length) out.push(args[i + 1])
  return out
}
function main() {
  const args = argv.slice(2)
  if (args.includes('--version') || args.includes('-v')) { console.log(VERSION); return 0 }
  const cmd = args[0]
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') { help(); return cmd ? 0 : 1 }

  const root = resolve(getFlagValue(args, '--root') || '.')
  if (!['init'].includes(cmd) && !existsSync(root)) { console.error(`${bad} not a directory: ${root}`); return 2 }
  const json = args.includes('--json')
  const ignores = loadIgnores(root, getAllFlagValues(args, '--exclude'))

  switch (cmd) {
    case 'init': return cmdInit(resolve('.'), args.includes('--minimal'), args.includes('--force'))
    case 'lint': return cmdLint(root, json, ignores)
    case 'resolve': {
      const target = args[1] && !args[1].startsWith('-') ? args[1] : null
      if (!target) { console.error(`${bad} usage: aigx resolve <path>`); return 2 }
      return cmdResolve(root, target, json, ignores)
    }
    case 'doctor': return cmdDoctor(root, ignores)
    case 'format': return cmdFormat(root, args.includes('--check'), ignores)
    case 'check-conformance': return cmdConformance(root, ignores)
    default:
      console.error(`${bad} unknown command: ${cmd}\n   run ${cyan('aigx --help')}`)
      return 2
  }
}

// ── embedded init templates ──────────────────────────────────────────────────
const T_PROTOCOL = `<aigx-protocol version="1.1">
  <read-first>Open .aigx/files.aigx and find the &lt;file&gt; entry for EACH file you will edit; obey its &lt;forbid pri="CRIT"&gt; and satisfy every id in its &lt;check&gt; before finishing.</read-first>
  <step n="1">Read the per-concern rule files in .aigx/ that the task touches.</step>
  <step n="2">Read .aigx/files.aigx for the per-file boundaries of files you edit.</step>
  <step n="3">Schema-first; failing test first; minimal change, local blast radius.</step>
  <step n="4">Run gates; verify each file's &lt;check&gt; ids hold before declaring done.</step>
</aigx-protocol>
`
const T_PRODUCT = `<aigx-product name="YOUR PRODUCT">
  <name>TODO: product name + the users/markets it serves</name>
  <standard>TODO: what does "good" mean here? (e.g. "instant on slow 4G", "auditable")</standard>
  <freshness>TODO: which older docs are historical and yield to this genome?</freshness>
  <stack>TODO: language, framework, data layer, test runner, validation.</stack>
</aigx-product>
`
const T_ARCH = `<aigx-architecture>
  <rule id="ARCH-feature-slice">TODO: top architectural rule (e.g. feature-sliced; each feature owns its modules).</rule>
  <rule id="ARCH-no-deep-imports">TODO: import-boundary rule (e.g. import features only through their public barrel; no deep imports).</rule>
  <rule id="ARCH-narrow-public-api">TODO: public-surface rule (e.g. expose the narrowest API; never re-export internals).</rule>
</aigx-architecture>
`
const T_ENG = `<aigx-engineering>
  <rule id="ENG-money-integer">Money is integer cents; floating-point arithmetic on monetary values is forbidden.</rule>
  <rule id="ENG-tenant-scope">Authorization checks must scope every query to the authenticated principal; cross-tenant access is forbidden.</rule>
  <rule id="ENG-bounded-cache">In-memory caches must have an explicit size cap and eviction policy; unbounded caches are forbidden.</rule>
</aigx-engineering>
`
const T_FILES = `<!--
  THE KEYSTONE: the per-file boundary index.
  One <file> entry per file an agent is LIKELY TO EDIT (not every file in the repo).
  Fields: path (attr, required), domain (attr), <role>, <forbid>, <gotcha>, <check>.
  Keep <forbid> rare; one <gotcha> per entry; <check> ids must resolve to real rules.
-->
<aigx-files>
  <file path="TODO/path/to/important_file.ext" domain="TODO-domain">
    <role>TODO: one line — what this file does</role>
    <forbid pri="CRIT">TODO (only if there's a real boundary): NEVER import …</forbid>
    <gotcha pri="CRIT">TODO: the single worst pitfall when editing this file</gotcha>
    <check>ARCH-no-deep-imports</check>
  </file>
</aigx-files>
`
const T_AGENT = `<aigx-agent>
  <rule id="AGENT-read-before-edit">Before editing any file, look up its &lt;file&gt; entry in .aigx/files.aigx and read its &lt;forbid&gt;, &lt;gotcha&gt;, and &lt;check&gt; ids.</rule>
  <rule id="AGENT-sync-on-rename">When you rename/move a file with a files.aigx entry, update its path in the SAME change-set.</rule>
  <rule id="AGENT-add-new-entry">When you create a new file agents will edit, add a &lt;file&gt; entry with a &lt;role&gt; and one &lt;check&gt; id.</rule>
  <rule id="AGENT-stable-ids">Never rename or delete a rule id; update the text in place. The id is permanent.</rule>
  <rule id="AGENT-verify-after-task">After renames/moves/deletes/adds, verify every &lt;file path&gt; still exists and every &lt;check&gt; id resolves; run aigx lint.</rule>
</aigx-agent>
`

exit(main())
