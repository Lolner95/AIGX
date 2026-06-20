/**
 * @aigx/parser — the reference parser for AIGX (AI Genome Exchange) genomes.
 *
 * Zero dependencies. Pure, text-in / data-out functions (no filesystem) plus a few
 * fs-based conveniences. The data model matches standard/AIGX-1.1.schema.json.
 *
 * Spec: https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.md
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, basename, relative } from 'node:path'

export const SPEC_VERSION = '1.1'

const RULE_RE        = /<rule\s+id="([^"]+)"\s*>([\s\S]*?)<\/rule>/g
const FILE_BLOCK_RE  = /<file\b[^>]*>[\s\S]*?<\/file>/g
const PATH_ATTR_RE   = /<file\b[^>]*\bpath="([^"]+)"/
const DOMAIN_ATTR_RE = /<file\b[^>]*\bdomain="([^"]+)"/
const CHECK_RE       = /<check>([\s\S]*?)<\/check>/
const FORBID_RE      = /<forbid\b([^>]*)>([\s\S]*?)<\/forbid>/
const GOTCHA_RE      = /<gotcha\b([^>]*)>([\s\S]*?)<\/gotcha>/
const ROLE_RE        = /<role>([\s\S]*?)<\/role>/
const PRI_RE         = /\bpri="([^"]+)"/
const ROOT_EL_RE     = /<(aigx-[A-Za-z0-9_-]+)\b/
const COMMENT_RE     = /<!--[\s\S]*?-->/g
const READFIRST_RE   = /<read-first>([\s\S]*?)<\/read-first>/
const STEP_RE        = /<step\b[^>]*>([\s\S]*?)<\/step>/g
const PROTO_VER_RE   = /<aigx-protocol\b[^>]*\bversion="([^"]+)"/
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '__pycache__', '.venv', 'venv'])

const toPosix = p => p.replace(/\\/g, '/')
const tidy = s => s.replace(/\s+/g, ' ').trim()

/** Remove XML comments before parsing (spec §8.4: comments are not structured content). */
export function stripComments(text) {
  return text.replace(COMMENT_RE, '')
}

/** Parse a concern file's text into [{ id, concern, text }]. */
export function parseRules(text) {
  const clean = stripComments(text)
  const concern = (ROOT_EL_RE.exec(clean)?.[1] || '').replace(/^aigx-/, '') || null
  const rules = []
  let m
  RULE_RE.lastIndex = 0
  while ((m = RULE_RE.exec(clean))) rules.push({ id: m[1], concern, text: tidy(m[2]) })
  return rules
}

/** Parse a single <file> block's text into a file entry object. */
export function parseFileBlock(block) {
  const path = PATH_ATTR_RE.exec(block)?.[1]?.trim()
  if (!path) return null
  const domain = DOMAIN_ATTR_RE.exec(block)?.[1]?.trim() ?? null
  const role = ROLE_RE.exec(block)
  const fb = FORBID_RE.exec(block)
  const gt = GOTCHA_RE.exec(block)
  const cm = CHECK_RE.exec(block)
  let checks = []
  if (cm) {
    const nested = [...cm[1].matchAll(/id="([^"]+)"/g)].map(x => x[1])
    checks = nested.length ? nested : cm[1].split(/\s+/).filter(Boolean)
  }
  const boundary = m => m ? { priority: PRI_RE.exec(m[1])?.[1] ?? null, text: tidy(m[2]) } : null
  return {
    path, domain,
    role: role ? tidy(role[1]) : null,
    forbid: boundary(fb),
    gotcha: boundary(gt),
    checks
  }
}

/** Parse files.aigx text into an array of file entries. */
export function parseFiles(text) {
  const clean = stripComments(text)
  return (clean.match(FILE_BLOCK_RE) || []).map(parseFileBlock).filter(Boolean)
}

/** Parse protocol.aigx text into { version, readFirst, steps }. */
export function parseProtocol(text) {
  const clean = stripComments(text)
  return {
    version: PROTO_VER_RE.exec(clean)?.[1] ?? null,
    readFirst: READFIRST_RE.exec(clean) ? tidy(READFIRST_RE.exec(clean)[1]) : null,
    steps: [...clean.matchAll(STEP_RE)].map(m => tidy(m[1]))
  }
}

/** Parse product.aigx text into { name, standard, freshness, stack }. */
export function parseProduct(text) {
  const clean = stripComments(text)
  const field = name => {
    const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(clean)
    return m ? tidy(m[1]) : null
  }
  return { name: field('name'), standard: field('standard'), freshness: field('freshness'), stack: field('stack') }
}

/** Find every .aigx directory under root (depth-first), skipping noise dirs. */
export function findGenomeDirs(root) {
  const out = []
  const walk = d => {
    let ents
    try { ents = readdirSync(d, { withFileTypes: true }) } catch { return }
    if (basename(d) === '.aigx') out.push(d)
    for (const e of ents) if (e.isDirectory() && !SKIP_DIRS.has(e.name)) walk(join(d, e.name))
  }
  walk(root)
  return out.sort()
}

/** Parse one .aigx directory into a genome object (matches the JSON schema's `genome`). */
export function parseGenomeDir(dir, root = dir) {
  const rd = f => readFileSync(join(dir, f), 'utf8')
  const has = f => existsSync(join(dir, f))
  const rules = []
  for (const fn of readdirSync(dir)) {
    if (fn.endsWith('.aigx') && fn !== 'files.aigx' && fn !== 'protocol.aigx' && fn !== 'product.aigx') {
      rules.push(...parseRules(rd(fn)))
    }
  }
  return {
    dir: toPosix(relative(root, dir)) || '.aigx',
    protocol: has('protocol.aigx') ? parseProtocol(rd('protocol.aigx')) : null,
    product: has('product.aigx') ? parseProduct(rd('product.aigx')) : null,
    rules,
    files: has('files.aigx') ? parseFiles(rd('files.aigx')) : [],
    domainCards: []
  }
}

/** Parse a whole repository into the canonical model: { aigxVersion, root, genomes }. */
export function parseGenome(root) {
  return {
    aigxVersion: SPEC_VERSION,
    root: toPosix(root),
    genomes: findGenomeDirs(root).map(d => parseGenomeDir(d, root))
  }
}

/** Resolve a single file's boundary entry in the model. Returns the entry or null. */
export function resolveFile(model, path) {
  const t = toPosix(path).replace(/^\.\//, '')
  for (const g of model.genomes) for (const e of g.files) if (toPosix(e.path) === t) return { genome: g.dir, ...e }
  return null
}
