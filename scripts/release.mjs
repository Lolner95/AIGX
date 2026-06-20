#!/usr/bin/env node
/**
 * release.mjs — preflight + dry-run + publish orchestrator for the AIGX package ecosystem.
 * Zero external dependencies (Node stdlib; shells out to npm / cargo / python / vsce).
 *
 *   node scripts/release.mjs check       version table + consistency + lint/conformance/format
 *   node scripts/release.mjs dry-run     check, then a dry-run of every registry (no upload)
 *   node scripts/release.mjs publish npm|pypi|cargo|vscode|all   actually publish (after you authenticate)
 *
 * `check` and `dry-run` never upload anything and never need credentials. `publish` does — log in first
 * (`npm login`, `twine`/PyPI token, `cargo login`, `vsce login`). See RELEASING.md.
 */
import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stdout, exit, argv } from 'node:process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const C = stdout.isTTY && !process.env.NO_COLOR
const sgr = (n, s) => C ? `\x1b[${n}m${s}\x1b[0m` : s
const bold = s => sgr(1, s), dim = s => sgr(2, s)
const green = s => sgr(32, s), red = s => sgr(31, s), yellow = s => sgr(33, s), cyan = s => sgr(36, s)
const ok = green('✔'), bad = red('✖'), warn = yellow('!'), skip = dim('–')

const R = p => readFileSync(join(ROOT, p), 'utf8')
const json = p => JSON.parse(R(p))
const reVer = (txt, re) => (re.exec(txt) || [])[1] || '?'

function run(cmd, opts = {}) { return execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', ...opts }) }
function tryRun(cmd, opts = {}) {
  try { return { ok: true, out: run(cmd, opts) } }
  catch (e) { return { ok: false, out: ((e.stdout || '') + (e.stderr || '') || e.message || '').trim() } }
}
function have(bin) {
  const probe = process.platform === 'win32' ? `where ${bin}` : `command -v ${bin}`
  try { run(probe); return true } catch { return false }
}

// ── versions ──────────────────────────────────────────────────────────────────
function versions() {
  const cli = json('packages/aigx/package.json').version
  const cliConst = reVer(R('packages/aigx/bin/aigx.mjs'), /const VERSION = '([^']+)'/)
  const py = reVer(R('pyproject.toml'), /\nversion\s*=\s*"([^"]+)"/)
  const pyConst = reVer(R('tools/aigx-lint/aigx_lint.py'), /__version__\s*=\s*"([^"]+)"/)
  const cargo = reVer(R('crates/aigx/Cargo.toml'), /\nversion\s*=\s*"([^"]+)"/)
  return {
    rows: [
      ['npm   aigx', cli, `bin VERSION ${cliConst === cli ? ok : red(cliConst)}`],
      ['npm   @aigx/parser', json('packages/parser/package.json').version, ''],
      ['npm   @aigx/lint', json('packages/lint/package.json').version, `dep @aigx/parser ${json('packages/lint/package.json').dependencies?.['@aigx/parser'] || '?'}`],
      ['npm   create-aigx', json('package.json').version, dim('(repo root)')],
      ['pypi  aigx', py, `aigx_lint __version__ ${pyConst === py ? ok : red(pyConst)}`],
      ['cargo aigx', cargo, dim('crates/aigx')],
      ['vsix  aigx-language-support', json('editors/vscode/package.json').version, dim('editors/vscode')],
    ],
    consistent: cliConst === cli && pyConst === py
  }
}

// ── check ───────────────────────────────────────────────────────────────────
function check() {
  console.log(`\n  ${bold('AIGX release — preflight')}\n`)
  const v = versions()
  for (const [name, ver, note] of v.rows) console.log(`  ${cyan(name.padEnd(28))} ${bold(ver.padEnd(8))} ${note}`)
  console.log()
  if (!v.consistent) { console.log(`  ${bad} version drift between a manifest and its in-source constant — fix before publishing\n`); return 1 }
  console.log(`  ${ok} manifest versions match their in-source constants\n`)

  const gates = [
    ['genome lint', 'node packages/aigx/bin/aigx.mjs lint --root .'],
    ['conformance', 'python tests/conformance/run.py'],
    ['format', 'node packages/aigx/bin/aigx.mjs format --root . --check'],
  ]
  let failed = 0
  for (const [label, cmd] of gates) {
    const r = tryRun(cmd)
    console.log(`  ${r.ok ? ok : bad} ${label}`)
    if (!r.ok) { failed++; console.log(dim(r.out.split('\n').slice(-4).map(l => '      ' + l).join('\n'))) }
  }
  console.log()
  if (failed) { console.log(`  ${bad} ${failed} preflight gate(s) failed — not safe to publish\n`); return 1 }
  console.log(`  ${green('Preflight clean.')}\n`)
  return 0
}

// ── dry-run ───────────────────────────────────────────────────────────────────
function step(label, fn) {
  const r = fn()
  const mark = r.status === 'ok' ? ok : r.status === 'skip' ? skip : r.status === 'warn' ? warn : bad
  console.log(`  ${mark} ${label}${r.note ? '  ' + dim(r.note) : ''}`)
  return r.status === 'fail'
}

function dryRun() {
  if (check()) return 1
  console.log(`  ${bold('Dry runs')} ${dim('(no uploads, no credentials needed)')}\n`)
  let fail = false

  // npm — per package
  for (const w of ['@aigx/parser', '@aigx/lint', 'aigx']) {
    fail = step(`npm publish --dry-run -w ${w}`, () => {
      const r = tryRun(`npm publish --dry-run --workspace ${w} --access public`)
      const n = reVer(r.out, /total files:\s*(\d+)/)
      return r.ok ? { status: 'ok', note: n !== '?' ? n + ' files' : 'would pack' }
                  : { status: 'fail', note: r.out.split('\n').slice(-1)[0] }
    }) || fail
  }
  fail = step('npm publish --dry-run (create-aigx)', () => {
    const r = tryRun('npm publish --dry-run')
    return r.ok ? { status: 'ok' } : { status: 'fail', note: r.out.split('\n').slice(-1)[0] }
  }) || fail

  // cargo
  fail = step('cargo publish --dry-run', () => {
    if (!have('cargo')) return { status: 'skip', note: 'cargo not installed' }
    const r = tryRun('cargo publish --dry-run --allow-dirty --manifest-path crates/aigx/Cargo.toml')
    return r.ok ? { status: 'ok' } : { status: 'warn', note: 'see RELEASING.md (often needs network/login): ' + r.out.split('\n').slice(-1)[0] }
  }) || fail

  // pypi
  step('python -m build + twine check', () => {
    const canBuild = tryRun('python -c "import build"').ok
    const canTwine = tryRun('python -c "import twine"').ok
    if (!canBuild || !canTwine) return { status: 'skip', note: 'pip install build twine, then re-run' }
    const b = tryRun('python -m build')
    if (!b.ok) return { status: 'fail', note: 'build failed' }
    const t = tryRun('python -m twine check dist/*')
    return t.ok ? { status: 'ok' } : { status: 'fail', note: 'twine check failed' }
  })

  // vscode
  step('vsce package (.vsix)', () => {
    const r = tryRun('npx --yes @vscode/vsce package --no-dependencies -o /tmp/aigx.vsix', { cwd: join(ROOT, 'editors/vscode') })
    return r.ok ? { status: 'ok', note: '/tmp/aigx.vsix' } : { status: 'skip', note: 'needs network/@vscode/vsce; see RELEASING.md' }
  })

  console.log()
  if (fail) { console.log(`  ${bad} a required (npm/cargo) dry-run failed — fix before publishing\n`); return 1 }
  console.log(`  ${green('Dry runs OK.')} ${dim('Publish with: node scripts/release.mjs publish <target>')}\n`)
  return 0
}

// ── publish (runs for real; requires auth) ────────────────────────────────────
const PUBLISH = {
  npm: [
    'npm publish --workspace @aigx/parser --access public',
    'npm publish --workspace @aigx/lint --access public',
    'npm publish --workspace aigx --access public',
    'npm publish', // create-aigx (root)
  ],
  cargo: ['cargo publish --manifest-path crates/aigx/Cargo.toml'],
  pypi: ['python -m build', 'python -m twine upload dist/*'],
  vscode: ['npx --yes @vscode/vsce publish'],
}
function publish(target) {
  if (check()) { console.log(`  ${bad} preflight failed — aborting publish\n`); return 1 }
  const targets = target === 'all' ? Object.keys(PUBLISH) : [target]
  if (!targets.every(t => PUBLISH[t])) { console.log(`  ${bad} unknown target: ${target} (npm|pypi|cargo|vscode|all)\n`); return 2 }
  for (const t of targets) {
    console.log(`\n  ${bold('publish: ' + t)}`)
    for (const cmd of PUBLISH[t]) {
      console.log(`  ${cyan('$')} ${cmd}${t === 'vscode' ? dim('  (cwd: editors/vscode)') : ''}`)
      try { run(cmd, { stdio: 'inherit', cwd: t === 'vscode' ? join(ROOT, 'editors/vscode') : ROOT }) }
      catch { console.log(`  ${bad} failed — are you logged in to ${t}? (see RELEASING.md)`); return 1 }
    }
  }
  console.log(`\n  ${green('Published: ' + targets.join(', '))}\n`)
  return 0
}

// ── dispatch ──────────────────────────────────────────────────────────────────
const cmd = argv[2] || 'check'
if (cmd === 'check') exit(check())
else if (cmd === 'dry-run') exit(dryRun())
else if (cmd === 'publish') exit(publish(argv[3] || ''))
else { console.log('usage: node scripts/release.mjs [check|dry-run|publish <target>]'); exit(2) }
