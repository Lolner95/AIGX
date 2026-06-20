/**
 * AIGX Language Support — VS Code extension entry point.
 *
 * Zero external dependencies: only the `vscode` API, Node built-ins, and ./lib/genome.js.
 * Features: diagnostics, hover on rule ids, go-to rule definition, tag + rule-id autocomplete,
 * document formatting, and "resolve current file's boundary".
 *
 * @license MIT
 */
'use strict'
const vscode = require('vscode')
const fs = require('node:fs')
const path = require('node:path')
const G = require('./lib/genome')

const RULE_ID_WORD = /[A-Za-z][A-Za-z0-9]*-[A-Za-z0-9-]+/
const STD_TAGS = [
  ['rule', 'rule id="$1">$2</rule>'],
  ['file', 'file path="$1" domain="$2">\n  <role>$3</role>\n  <check>$4</check>\n</file>'],
  ['role', 'role>$1</role>'],
  ['forbid', 'forbid pri="CRIT">$1</forbid>'],
  ['gotcha', 'gotcha>$1</gotcha>'],
  ['check', 'check>$1</check>'],
  ['read-first', 'read-first>$1</read-first>'],
  ['step', 'step n="$1">$2</step>'],
  ['fact', 'fact>$1</fact>'],
  ['aigx-protocol', 'aigx-protocol version="1.1">\n  $1\n</aigx-protocol>'],
  ['aigx-files', 'aigx-files>\n  $1\n</aigx-files>'],
  ['aigx-architecture', 'aigx-architecture>\n  $1\n</aigx-architecture>'],
  ['aigx-product', 'aigx-product name="$1">\n  $2\n</aigx-product>'],
  ['aigx-domain', 'aigx-domain key="$1" path="$2">\n  $3\n</aigx-domain>']
]

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function repoRootFor(uri) {
  const f = vscode.workspace.getWorkspaceFolder(uri)
  if (f) return f.uri.fsPath
  return path.dirname(path.dirname(uri.fsPath)) // fallback: parent of the .aigx dir
}

function genomeDirOf(doc) {
  const dir = path.dirname(doc.fileName)
  return path.basename(dir) === '.aigx' ? dir : G.genomeDirFor(doc.fileName, repoRootFor(doc.uri))
}

function ruleBody(genomeDir, id) {
  const def = G.findRuleDefinition(genomeDir, id)
  if (!def) return null
  try {
    const text = G.blankComments(fs.readFileSync(def.file, 'utf8'))
    const m = new RegExp(`<rule\\s+id="${escapeRe(id)}"\\s*>([\\s\\S]*?)</rule>`).exec(text)
    return { text: m ? G.tidy(m[1]) : '', file: def.file, def }
  } catch { return null }
}

// ── diagnostics ───────────────────────────────────────────────────────────────
let diagnostics

function validateDocument(doc) {
  if (doc.languageId !== 'aigx') return
  if (!vscode.workspace.getConfiguration('aigx').get('diagnostics.enabled', true)) {
    diagnostics.delete(doc.uri); return
  }
  const base = path.basename(doc.fileName)
  const text = doc.getText()
  let issues = []
  try {
    if (base === 'files.aigx') {
      const genomeDir = genomeDirOf(doc)
      const ruleIds = genomeDir ? G.collectRules(genomeDir).ids : new Set()
      issues = G.validateText('files', text, { ruleIds, repoRoot: repoRootFor(doc.uri) })
    } else if (!['protocol.aigx', 'product.aigx'].includes(base)) {
      issues = G.validateText('concern', text, {})
    }
  } catch (e) { /* never let a parse bug break the editor */ }

  diagnostics.set(doc.uri, issues.map(i => {
    const d = new vscode.Diagnostic(
      new vscode.Range(doc.positionAt(i.start), doc.positionAt(i.end)),
      i.message,
      i.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
    )
    d.source = 'aigx'
    return d
  }))
}

function validateAllOpen() {
  for (const doc of vscode.workspace.textDocuments) validateDocument(doc)
}

// ── command: resolve current file's boundary ───────────────────────────────────
let output
function cmdResolve() {
  const ed = vscode.window.activeTextEditor
  if (!ed) { vscode.window.showInformationMessage('AIGX: open a file first.'); return }
  const root = repoRootFor(ed.document.uri)
  const rel = G.toPosix(path.relative(root, ed.document.fileName))
  const res = G.resolveBoundary(root, rel)
  if (!res) {
    vscode.window.showInformationMessage(`AIGX: no boundary entry for ${rel}`)
    return
  }
  const e = res.entry
  output.clear()
  output.appendLine(`AIGX boundary for ${rel}`)
  output.appendLine(`  applicable genome: ${G.toPosix(path.relative(root, res.genomeDir))}`)
  if (e.role) output.appendLine(`  role:    ${e.role}`)
  if (e.forbid) output.appendLine(`  forbid:  ${e.forbid}`)
  if (e.gotcha) output.appendLine(`  gotcha:  ${e.gotcha}`)
  if (e.checks.length) output.appendLine(`  checks:  ${e.checks.map(c => c.id).join(', ')}`)
  output.show(true)
  vscode.window.showInformationMessage(`AIGX: ${e.role || rel}${e.forbid ? ' · ⛔ ' + e.forbid : ''}`)
}

function cmdLint() {
  const folders = vscode.workspace.workspaceFolders || []
  let genomes = 0, errors = 0
  for (const folder of folders) {
    for (const dir of G.findGenomeDirs(folder.uri.fsPath)) {
      genomes++
      const ruleIds = G.collectRules(dir).ids
      const filesPath = path.join(dir, 'files.aigx')
      try {
        const text = fs.readFileSync(filesPath, 'utf8')
        errors += G.validateText('files', text, { ruleIds, repoRoot: folder.uri.fsPath })
          .filter(i => i.severity === 'error').length
      } catch {}
    }
  }
  validateAllOpen()
  vscode.window.showInformationMessage(`AIGX: ${genomes} genome(s) scanned, ${errors} error(s) in boundary indexes.`)
}

// ── activate ───────────────────────────────────────────────────────────────────
function activate(context) {
  diagnostics = vscode.languages.createDiagnosticCollection('aigx')
  output = vscode.window.createOutputChannel('AIGX')
  context.subscriptions.push(diagnostics, output)

  const runMode = () => vscode.workspace.getConfiguration('aigx').get('diagnostics.run', 'onType')
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(validateDocument),
    vscode.workspace.onDidChangeTextDocument(e => { if (runMode() === 'onType') validateDocument(e.document) }),
    vscode.workspace.onDidSaveTextDocument(validateDocument),
    vscode.workspace.onDidCloseTextDocument(d => diagnostics.delete(d.uri))
  )
  validateAllOpen()

  // Hover on a rule id → its full rule text.
  context.subscriptions.push(vscode.languages.registerHoverProvider('aigx', {
    provideHover(doc, pos) {
      const range = doc.getWordRangeAtPosition(pos, RULE_ID_WORD)
      if (!range) return
      const id = doc.getText(range)
      const genomeDir = genomeDirOf(doc)
      if (!genomeDir) return
      const info = ruleBody(genomeDir, id)
      if (!info) return
      const md = new vscode.MarkdownString()
      md.appendMarkdown(`**\`${id}\`** — _${path.basename(info.file)}_\n\n${info.text}`)
      return new vscode.Hover(md, range)
    }
  }))

  // Go to rule definition.
  context.subscriptions.push(vscode.languages.registerDefinitionProvider('aigx', {
    async provideDefinition(doc, pos) {
      const range = doc.getWordRangeAtPosition(pos, RULE_ID_WORD)
      if (!range) return
      const genomeDir = genomeDirOf(doc)
      if (!genomeDir) return
      const def = G.findRuleDefinition(genomeDir, doc.getText(range))
      if (!def) return
      const tdoc = await vscode.workspace.openTextDocument(vscode.Uri.file(def.file))
      return new vscode.Location(tdoc.uri, new vscode.Range(tdoc.positionAt(def.start), tdoc.positionAt(def.end)))
    }
  }))

  // Autocomplete: standard tags after '<', rule ids inside <check>.
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider('aigx', {
    provideCompletionItems(doc, pos) {
      const prefix = doc.getText(new vscode.Range(new vscode.Position(0, 0), pos))
      const line = doc.lineAt(pos).text.slice(0, pos.character)
      const inCheck = prefix.lastIndexOf('<check>') > prefix.lastIndexOf('</check>')
      const items = []
      if (inCheck) {
        const genomeDir = genomeDirOf(doc)
        if (genomeDir) {
          const { defs } = G.collectRules(genomeDir)
          for (const [id, def] of defs) {
            const it = new vscode.CompletionItem(id, vscode.CompletionItemKind.Reference)
            it.detail = path.basename(def.file)
            const info = ruleBody(genomeDir, id)
            if (info) it.documentation = new vscode.MarkdownString(info.text)
            items.push(it)
          }
        }
      }
      if (/<[A-Za-z-]*$/.test(line)) {
        for (const [tag, body] of STD_TAGS) {
          const it = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Snippet)
          it.insertText = new vscode.SnippetString(body)
          it.detail = 'AIGX tag'
          // VS Code already consumed the typed '<'; our snippet must not repeat it.
          items.push(it)
        }
      }
      return items
    }
  }, '<', ' '))

  // Format document: parity-safe whitespace normalization (same as `aigx format`).
  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider('aigx', {
    provideDocumentFormattingEdits(doc) {
      const collapse = vscode.workspace.getConfiguration('aigx').get('format.normalizeBlankLines', true)
      const formatted = G.normalize(doc.getText(), collapse)
      if (formatted === doc.getText()) return []
      const full = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length))
      return [vscode.TextEdit.replace(full, formatted)]
    }
  }))

  context.subscriptions.push(
    vscode.commands.registerCommand('aigx.resolve', cmdResolve),
    vscode.commands.registerCommand('aigx.lint', cmdLint),
    vscode.commands.registerCommand('aigx.gotoRule', () =>
      vscode.commands.executeCommand('editor.action.revealDefinition'))
  )
}

function deactivate() {}

module.exports = { activate, deactivate }
