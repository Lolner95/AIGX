/**
 * genome.js — the self-contained AIGX intelligence for the VS Code extension.
 *
 * Pure Node (fs + path), no `vscode` dependency, so it can be unit-tested standalone.
 * Offset-aware: parsers return character offsets so the extension can map them to ranges
 * for diagnostics, hover, and go-to-definition. Mirrors @aigx/parser + @aigx/lint semantics.
 *
 * @license MIT
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '__pycache__', '.venv', 'venv', 'target'])
const NON_CONCERN = new Set(['files.aigx', 'protocol.aigx', 'product.aigx'])
const RULE_ID_RE = /[A-Za-z][A-Za-z0-9]*-[A-Za-z0-9-]+/

const toPosix = p => p.replace(/\\/g, '/')
const tidy = s => s.replace(/\s+/g, ' ').trim()

/** Blank out XML comments while preserving every other character's offset. */
function blankComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '))
}

function escapesRoot(p) {
  const q = toPosix(p)
  return /(^|\/)\.\.(\/|$)/.test(q) || q.startsWith('/') || /^[A-Za-z]:/.test(q)
}

function isRuleId(s) {
  return new RegExp('^' + RULE_ID_RE.source + '$').test(s)
}

/** All <rule id="..."> definitions in a concern file's text, with id-value offsets. */
function parseRuleDefs(text) {
  const t = blankComments(text)
  const re = /<rule\s+id="([^"]+)"/g
  const out = []
  let m
  while ((m = re.exec(t))) {
    const id = m[1]
    const valueStart = m.index + m[0].length - 1 - id.length
    out.push({ id, start: valueStart, end: valueStart + id.length })
  }
  return out
}

/**
 * All <file> entries in files.aigx text, offset-aware.
 * Each entry: { path, pathStart, pathEnd, checks:[{id,start,end}], hasForbid, role, forbid, gotcha, blockStart }
 */
function parseFileEntries(text) {
  const t = blankComments(text)
  const out = []
  const blockRe = /<file\b[^>]*>[\s\S]*?<\/file>/g
  let bm
  while ((bm = blockRe.exec(t))) {
    const block = bm[0]
    const base = bm.index
    const pathM = /<file\b[^>]*?\bpath="([^"]+)"/.exec(block)
    if (!pathM) continue
    const p = pathM[1]
    const pathStart = base + pathM.index + pathM[0].length - 1 - p.length

    const checks = []
    const cm = /<check>([\s\S]*?)<\/check>/.exec(block)
    if (cm) {
      const inner = cm[1]
      const innerBase = base + cm.index + '<check>'.length
      const idAttr = /id="([^"]+)"/g // gloss form <c id="X">
      let am, gloss = false
      while ((am = idAttr.exec(inner))) {
        gloss = true
        const id = am[1]
        const s = innerBase + am.index + am[0].length - 1 - id.length
        checks.push({ id, start: s, end: s + id.length })
      }
      if (!gloss) {
        const tok = /\S+/g
        let tm
        while ((tm = tok.exec(inner))) {
          checks.push({ id: tm[0], start: innerBase + tm.index, end: innerBase + tm.index + tm[0].length })
        }
      }
    }
    const roleM = /<role>([\s\S]*?)<\/role>/.exec(block)
    const forbidM = /<forbid\b[^>]*>([\s\S]*?)<\/forbid>/.exec(block)
    const gotchaM = /<gotcha\b[^>]*>([\s\S]*?)<\/gotcha>/.exec(block)
    out.push({
      path: p.trim(),
      pathStart, pathEnd: pathStart + p.length,
      checks,
      hasForbid: /<forbid\b/.test(block),
      role: roleM ? tidy(roleM[1]) : null,
      forbid: forbidM ? tidy(forbidM[1]) : null,
      gotcha: gotchaM ? tidy(gotchaM[1]) : null,
      blockStart: base
    })
  }
  return out
}

/** Nearest ancestor `.aigx` directory for a file, searching up to (and including) `stopRoot`. */
function genomeDirFor(absFile, stopRoot) {
  let dir = path.dirname(absFile)
  const stop = stopRoot ? path.resolve(stopRoot) : path.parse(dir).root
  // If the file is itself inside an .aigx dir, that's the genome.
  if (path.basename(dir) === '.aigx') return dir
  while (true) {
    const candidate = path.join(dir, '.aigx')
    try { if (fs.statSync(candidate).isDirectory()) return candidate } catch {}
    if (path.resolve(dir) === stop || path.dirname(dir) === dir) break
    dir = path.dirname(dir)
  }
  return null
}

function listConcernFiles(genomeDir) {
  let names = []
  try { names = fs.readdirSync(genomeDir) } catch { return [] }
  return names
    .filter(n => n.endsWith('.aigx') && !NON_CONCERN.has(n))
    .sort()
    .map(n => path.join(genomeDir, n))
}

/** Map of ruleId -> {file, start, end} (first definition) plus a Set of all ids and a list of duplicates. */
function collectRules(genomeDir) {
  const defs = new Map()
  const ids = new Set()
  const dups = []
  for (const file of listConcernFiles(genomeDir)) {
    let text
    try { text = fs.readFileSync(file, 'utf8') } catch { continue }
    for (const d of parseRuleDefs(text)) {
      if (ids.has(d.id)) dups.push({ id: d.id, file, start: d.start, end: d.end })
      else { ids.add(d.id); defs.set(d.id, { file, start: d.start, end: d.end }) }
    }
  }
  return { defs, ids, dups }
}

/** Find a single rule's definition location across a genome's concern files. */
function findRuleDefinition(genomeDir, id) {
  return collectRules(genomeDir).defs.get(id) || null
}

/** Recursively find every `.aigx` directory under root (skips noise dirs + .aigxignore prefixes). */
function findGenomeDirs(root) {
  const out = []
  const ignores = readIgnores(root)
  const walk = dir => {
    let ents
    try { ents = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    if (path.basename(dir) === '.aigx') { out.push(dir); return }
    for (const e of ents) {
      if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue
      const rel = toPosix(path.relative(root, path.join(dir, e.name)))
      if (ignores.some(ig => rel === ig || rel.startsWith(ig + '/'))) continue
      walk(path.join(dir, e.name))
    }
  }
  walk(root)
  return out.sort()
}

function readIgnores(root) {
  try {
    return fs.readFileSync(path.join(root, '.aigxignore'), 'utf8')
      .split(/\r?\n/).map(l => l.split('#')[0].trim().replace(/\/+$/, '')).filter(Boolean).map(toPosix)
  } catch { return [] }
}

/** Resolve a repo-relative file path to its boundary entry across all genomes under root. */
function resolveBoundary(root, relPath) {
  const target = toPosix(relPath).replace(/^\.\//, '')
  for (const dir of findGenomeDirs(root)) {
    const filesPath = path.join(dir, 'files.aigx')
    let text
    try { text = fs.readFileSync(filesPath, 'utf8') } catch { continue }
    for (const e of parseFileEntries(text)) {
      if (toPosix(e.path) === target) return { genomeDir: dir, entry: e }
    }
  }
  return null
}

/**
 * Validate one genome document's text. Returns issues with offsets into THIS document.
 * kind: 'files' validates a files.aigx; 'concern' validates a concern file (dup ids).
 * For 'files', pass repoRoot + the genome's rule-id set.
 */
function validateText(kind, text, ctx) {
  const issues = []
  if (kind === 'concern') {
    const seen = new Set()
    for (const d of parseRuleDefs(text)) {
      if (seen.has(d.id)) {
        issues.push({ severity: 'error', start: d.start, end: d.end,
          message: `duplicate <rule id="${d.id}"> (rule ids MUST be unique)` })
      } else seen.add(d.id)
    }
    return issues
  }
  if (kind === 'files') {
    const ids = ctx.ruleIds || new Set()
    const repoRoot = ctx.repoRoot
    const seenPaths = new Map()
    for (const e of parseFileEntries(text)) {
      if (escapesRoot(e.path)) {
        issues.push({ severity: 'error', start: e.pathStart, end: e.pathEnd,
          message: `path escapes the repository root (forbidden)` })
      } else if (repoRoot) {
        try {
          fs.statSync(path.join(repoRoot, e.path))
        } catch {
          issues.push({ severity: 'warning', start: e.pathStart, end: e.pathEnd,
            message: `file entry path does not exist: ${e.path} (stale/renamed entry)` })
        }
      }
      for (const c of e.checks) {
        if (!ids.has(c.id)) {
          issues.push({ severity: 'error', start: c.start, end: c.end,
            message: `<check> id '${c.id}' does not resolve to any <rule id>` })
        }
      }
      if (seenPaths.has(e.path)) {
        issues.push({ severity: 'warning', start: e.pathStart, end: e.pathEnd,
          message: `duplicate <file> entry for ${e.path}` })
      } else seenPaths.set(e.path, true)
    }
  }
  return issues
}

/** Parity-safe formatter: trim trailing whitespace, collapse 3+ blank lines, single trailing newline. */
function normalize(text, collapseBlanks = true) {
  let out = text.replace(/[ \t]+(\r?\n)/g, '$1')
  if (collapseBlanks) out = out.replace(/(\r?\n){3,}/g, '\n\n')
  return out.replace(/\s*$/, '') + '\n'
}

module.exports = {
  RULE_ID_RE, toPosix, tidy, blankComments, escapesRoot, isRuleId,
  parseRuleDefs, parseFileEntries, genomeDirFor, listConcernFiles,
  collectRules, findRuleDefinition, findGenomeDirs, resolveBoundary,
  validateText, normalize
}
