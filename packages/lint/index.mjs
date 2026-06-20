/**
 * @aigx/lint — programmatic validator for AIGX (AI Genome Exchange) genomes.
 *
 * Built on @aigx/parser. Zero runtime dependencies beyond it. Implements the
 * conformance-validator requirements V1–V7 of the AIGX 1.1 spec (standard/conformance.md).
 *
 * Spec: https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.md
 */
import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { findGenomeDirs, parseGenomeDir } from '@aigx/parser'

const toPosix = p => p.replace(/\\/g, '/')
const escapesRoot = p => /(^|\/)\.\.(\/|$)/.test(toPosix(p)) || p.startsWith('/') || /^[A-Za-z]:/.test(p)

/** Filter genome dirs by repo-relative ignore prefixes (matches the aigx CLI). */
function applyIgnores(dirs, root, ignores) {
  const ig = (ignores || []).map(toPosix)
  if (!ig.length) return dirs
  return dirs.filter(d => {
    const rel = toPosix(relative(root, d))
    return !ig.some(x => rel === x || rel.startsWith(x + '/'))
  })
}

/**
 * Validate the genome(s) under `root`.
 * @param {string} root repository root
 * @param {object} [opts]
 * @param {string[]} [opts.ignores] repo-relative dir prefixes to skip
 * @returns {{ ok:boolean, errors:string[], warnings:string[], stats:object }}
 */
export function lint(root, opts = {}) {
  const dirs = applyIgnores(findGenomeDirs(root), root, opts.ignores)

  const errors = [], warnings = []
  if (!dirs.length) return { ok: false, errors: [`no .aigx/ genome found under ${root}`], warnings, stats: {} }

  // First pass: collect all rule ids across genomes + detect duplicates per genome.
  const allRules = new Set()
  const parsed = []
  for (const dir of dirs) {
    const g = parseGenomeDir(dir, root)
    const seen = new Set(), dups = new Set()
    for (const r of g.rules) { (seen.has(r.id) ? dups : seen).add(r.id); allRules.add(r.id) }
    parsed.push({ dir, g, dups: [...dups] })
  }

  const seenPaths = new Map()
  let nEntries = 0, nForbid = 0
  for (const { dir, g, dups } of parsed) {
    const rel = g.dir
    for (const id of dups) errors.push(`[${rel}] duplicate <rule id="${id}"> (rule ids MUST be unique)`)
    if (g.rules.length === 0) errors.push(`[${rel}] no <rule id> found in any concern file (need ≥1)`)
    if (!existsSync(join(dir, 'protocol.aigx'))) errors.push(`[${rel}] missing required protocol.aigx`)
    if (!existsSync(join(dir, 'files.aigx'))) errors.push(`[${rel}] missing required files.aigx`)
    else if (g.files.length === 0) errors.push(`[${rel}] files.aigx has no <file> entries (need ≥1)`)

    for (const e of g.files) {
      nEntries++
      if (e.forbid) nForbid++
      if (escapesRoot(e.path)) { errors.push(`[${rel}] <file path="${e.path}"> escapes the repository root`); continue }
      if (!existsSync(join(root, e.path))) errors.push(`[${rel}] file entry path does not exist: ${e.path}`)
      for (const c of e.checks) if (!allRules.has(c)) errors.push(`[${rel}] <check> id '${c}' (in ${e.path}) does not resolve`)
      if (seenPaths.has(e.path)) warnings.push(`duplicate <file> entry for ${e.path} (in ${rel} and ${seenPaths.get(e.path)})`)
      else seenPaths.set(e.path, rel)
    }
  }
  const forbidPercent = nEntries ? Math.round(100 * nForbid / nEntries) : 0
  if (forbidPercent > 40) warnings.push(`<forbid> density is ${forbidPercent}% of entries — scarcity preserves salience`)

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: { genomes: dirs.length, rules: allRules.size, fileEntries: nEntries, forbidPercent }
  }
}

/** Convenience: returns the conformance level (0 non-conforming, 1 conforming, 2 recommended) per genome. */
export function conformance(root, opts = {}) {
  const dirs = applyIgnores(findGenomeDirs(root), root, opts.ignores)
  const allRules = new Set()
  const parsed = dirs.map(dir => parseGenomeDir(dir, root))
  parsed.forEach(g => g.rules.forEach(r => allRules.add(r.id)))
  return parsed.map((g, i) => {
    const dir = dirs[i]
    const g1 = existsSync(join(dir, 'protocol.aigx'))
    const ids = g.rules.map(r => r.id)
    const g2 = ids.length > 0 && new Set(ids).size === ids.length
    const g3 = g.files.length > 0
    const g4 = g.files.every(e => e.checks.every(c => allRules.has(c)))
    const conforms = g1 && g2 && g3 && g4
    const freshness = !!g.product?.freshness
    const nForbid = g.files.filter(e => e.forbid).length
    const scarce = g.files.length ? nForbid / g.files.length <= 0.4 : true
    const level = !conforms ? 0 : (freshness && scarce ? 2 : 1)
    return { dir: g.dir, level, g1, g2, g3, g4, freshness, scarce }
  })
}
