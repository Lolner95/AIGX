//! aigx — the AIGX (AI Genome Exchange) CLI, Rust reference implementation.
//!
//! Zero dependencies (Rust std only). A genome validator + resolver + scaffolder that agrees,
//! fixture-for-fixture, with the Node (`aigx` / `@aigx/lint`) and Python (`aigx-lint`) reference
//! validators. Cross-language agreement is enforced by tests/conformance/run.py.
//!
//! Commands:
//!   aigx lint [--root DIR] [--exclude DIR] [--json]   validate genome(s); non-zero exit on errors
//!   aigx resolve <path> [--root DIR]                  print one file's boundary (O(1) lookup)
//!   aigx init [--force]                               scaffold a minimal .aigx/ genome
//!   aigx --version | --help
//!
//! Spec: https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.md
//! License: MIT

use std::collections::{HashMap, HashSet};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::exit;

const VERSION: &str = "1.2.0";
const SPEC_VERSION: &str = "1.1";
const SKIP: &[&str] = &[".git", "node_modules", "dist", "build", "__pycache__", ".venv", "venv"];
const NON_CONCERN: &[&str] = &["files.aigx", "protocol.aigx", "product.aigx"];

// ── text helpers ────────────────────────────────────────────────────────────
fn read_file(p: &Path) -> String {
    fs::read(p).map(|b| String::from_utf8_lossy(&b).into_owned()).unwrap_or_default()
}
fn posix(s: &str) -> String { s.replace('\\', "/") }
fn tidy(s: &str) -> String { s.split_whitespace().collect::<Vec<_>>().join(" ") }

fn strip_comments(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    while let Some(i) = rest.find("<!--") {
        out.push_str(&rest[..i]);
        match rest[i + 4..].find("-->") {
            Some(j) => rest = &rest[i + 4 + j + 3..],
            None => { rest = ""; break; }
        }
    }
    out.push_str(rest);
    out
}

/// Value of the first `name="..."` attribute found in `s`.
fn attr(s: &str, name: &str) -> Option<String> {
    let pat = format!("{}=\"", name);
    let i = s.find(&pat)? + pat.len();
    let j = s[i..].find('"')?;
    Some(s[i..i + j].trim().to_string())
}

fn all_id_attrs(inner: &str) -> Vec<String> {
    let mut out = vec![];
    let mut rest = inner;
    while let Some(i) = rest.find("id=\"") {
        let after = &rest[i + 4..];
        match after.find('"') {
            Some(e) => { out.push(after[..e].to_string()); rest = &after[e + 1..]; }
            None => break,
        }
    }
    out
}

fn json_escape(s: &str) -> String {
    let mut o = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '"' => o.push_str("\\\""),
            '\\' => o.push_str("\\\\"),
            '\n' => o.push_str("\\n"),
            '\r' => o.push_str("\\r"),
            '\t' => o.push_str("\\t"),
            c if (c as u32) < 0x20 => o.push_str(&format!("\\u{:04x}", c as u32)),
            c => o.push(c),
        }
    }
    o
}

// ── parsing ─────────────────────────────────────────────────────────────────
/// Rule ids declared in a concern file (matches /<rule\s+id="([^"]+)"/).
fn rule_ids(text: &str) -> Vec<String> {
    let clean = strip_comments(text);
    let mut out = vec![];
    let mut rest = clean.as_str();
    while let Some(i) = rest.find("<rule") {
        let after = &rest[i + 5..];
        match after.chars().next() {
            Some(c) if c.is_whitespace() => {
                let tagend = after.find('>').unwrap_or(after.len());
                if let Some(id) = attr(&after[..tagend], "id") {
                    out.push(id);
                }
                rest = &after[tagend..];
            }
            _ => rest = after,
        }
    }
    out
}

struct Boundary { pri: Option<String>, text: String }
struct Entry {
    path: String,
    role: Option<String>,
    forbid: Option<Boundary>,
    gotcha: Option<Boundary>,
    checks: Vec<String>,
    has_forbid: bool,
}

fn parse_boundary(block: &str, name: &str) -> Option<Boundary> {
    let open = format!("<{}", name);
    let i = block.find(&open)?;
    let after = &block[i + open.len()..];
    let tagend = after.find('>')?;
    let pri = attr(&after[..tagend], "pri");
    let body = &after[tagend + 1..];
    let e = body.find(&format!("</{}>", name))?;
    Some(Boundary { pri, text: tidy(&body[..e]) })
}

fn between(block: &str, open: &str, close: &str) -> Option<String> {
    let a = block.find(open)? + open.len();
    let b = block[a..].find(close)?;
    Some(tidy(&block[a..a + b]))
}

fn parse_checks(block: &str) -> Vec<String> {
    match (block.find("<check>"), block.find("</check>")) {
        (Some(a), Some(b)) if b > a => {
            let inner = &block[a + 7..b];
            let ids = all_id_attrs(inner);
            if !ids.is_empty() { ids } else { inner.split_whitespace().map(String::from).collect() }
        }
        _ => vec![],
    }
}

fn parse_entries(text: &str) -> Vec<Entry> {
    let clean = strip_comments(text);
    let mut out = vec![];
    let mut rest = clean.as_str();
    while let Some(i) = rest.find("<file") {
        let after = &rest[i..];
        match after[5..].chars().next() {
            Some(c) if c.is_whitespace() || c == '>' => {}
            _ => { rest = &after[5..]; continue; }
        }
        match after.find("</file>") {
            Some(end) => {
                let block = &after[..end + 7];
                if let Some(path) = attr(block, "path") {
                    out.push(Entry {
                        path,
                        role: between(block, "<role>", "</role>"),
                        forbid: parse_boundary(block, "forbid"),
                        gotcha: parse_boundary(block, "gotcha"),
                        checks: parse_checks(block),
                        has_forbid: block.contains("<forbid"),
                    });
                }
                rest = &after[end + 7..];
            }
            None => break,
        }
    }
    out
}

// ── discovery ───────────────────────────────────────────────────────────────
fn escapes_root(p: &str) -> bool {
    let q = posix(p);
    q == ".." || q.starts_with("../") || q.contains("/../") || q.ends_with("/..")
        || q.starts_with('/')
        || (q.len() >= 2 && q.as_bytes()[1] == b':' && (q.as_bytes()[0] as char).is_ascii_alphabetic())
}

fn relpath(dir: &Path, root: &Path) -> String {
    match dir.strip_prefix(root) {
        Ok(p) => { let s = posix(&p.to_string_lossy()); if s.is_empty() { ".aigx".into() } else { s } }
        Err(_) => posix(&dir.to_string_lossy()),
    }
}

fn load_ignores(root: &Path, cli: &[String]) -> Vec<String> {
    let mut ig: Vec<String> = cli.iter().map(|x| posix(x)).collect();
    let f = root.join(".aigxignore");
    if f.exists() {
        for line in read_file(&f).lines() {
            let s = line.split('#').next().unwrap_or("").trim().trim_end_matches('/');
            if !s.is_empty() { ig.push(posix(s)); }
        }
    }
    ig
}
fn ignored(rel: &str, ig: &[String]) -> bool {
    ig.iter().any(|x| rel == x || rel.starts_with(&format!("{}/", x)))
}

fn find_genome_dirs(root: &Path, ig: &[String]) -> Vec<PathBuf> {
    let mut out = vec![];
    walk(root, root, ig, &mut out);
    out.sort();
    out
}
fn walk(root: &Path, dir: &Path, ig: &[String], out: &mut Vec<PathBuf>) {
    if dir.file_name().and_then(|n| n.to_str()) == Some(".aigx") {
        if !ignored(&relpath(dir, root), ig) { out.push(dir.to_path_buf()); }
        return;
    }
    let rd = match fs::read_dir(dir) { Ok(r) => r, Err(_) => return };
    for e in rd.flatten() {
        let p = e.path();
        if !p.is_dir() { continue; }
        let name = e.file_name().to_string_lossy().into_owned();
        if SKIP.contains(&name.as_str()) { continue; }
        if ignored(&relpath(&p, root), ig) { continue; }
        walk(root, &p, ig, out);
    }
}

struct Genome {
    rel: String,
    rules: HashSet<String>,
    dups: Vec<String>,
    entries: Vec<Entry>,
    has_protocol: bool,
    has_files: bool,
}

fn gather(root: &Path, ig: &[String]) -> (Vec<Genome>, HashSet<String>) {
    let mut genomes = vec![];
    let mut all = HashSet::new();
    for dir in find_genome_dirs(root, ig) {
        let mut names: Vec<String> = fs::read_dir(&dir)
            .map(|rd| rd.flatten()
                .filter_map(|e| {
                    let n = e.file_name().to_string_lossy().into_owned();
                    if n.ends_with(".aigx") && !NON_CONCERN.contains(&n.as_str()) { Some(n) } else { None }
                }).collect())
            .unwrap_or_default();
        names.sort();
        let mut seen = HashSet::new();
        let mut dups = vec![];
        for n in &names {
            for id in rule_ids(&read_file(&dir.join(n))) {
                if !seen.insert(id.clone()) { dups.push(id); }
            }
        }
        for id in &seen { all.insert(id.clone()); }
        let files_path = dir.join("files.aigx");
        let has_files = files_path.exists();
        let entries = if has_files { parse_entries(&read_file(&files_path)) } else { vec![] };
        genomes.push(Genome {
            rel: relpath(&dir, root),
            rules: seen,
            dups,
            entries,
            has_protocol: dir.join("protocol.aigx").exists(),
            has_files,
        });
    }
    (genomes, all)
}

// ── commands ────────────────────────────────────────────────────────────────
fn cmd_lint(root: &Path, json: bool, ig: &[String]) -> i32 {
    let (genomes, all) = gather(root, ig);
    if genomes.is_empty() {
        eprintln!("aigx: no .aigx/ genome found under {}", root.display());
        return 2;
    }
    let mut errors: Vec<String> = vec![];
    let mut warnings: Vec<String> = vec![];
    let mut seen_paths: HashMap<String, String> = HashMap::new();
    let mut n_entries = 0usize;
    let mut n_forbid = 0usize;
    for g in &genomes {
        let rel = &g.rel;
        for d in &g.dups {
            errors.push(format!("[{}] duplicate <rule id=\"{}\"> (rule ids MUST be unique)", rel, d));
        }
        if g.rules.is_empty() {
            errors.push(format!("[{}] no <rule id> found in any concern file (need >=1)", rel));
        }
        if !g.has_protocol { errors.push(format!("[{}] missing required protocol.aigx", rel)); }
        if !g.has_files {
            errors.push(format!("[{}] missing required files.aigx", rel));
        } else if g.entries.is_empty() {
            errors.push(format!("[{}] files.aigx has no <file> entries (need >=1)", rel));
        }
        for e in &g.entries {
            n_entries += 1;
            if e.has_forbid { n_forbid += 1; }
            if escapes_root(&e.path) {
                errors.push(format!("[{}] <file path=\"{}\"> escapes the repository root", rel, e.path));
                continue;
            }
            if !root.join(&e.path).exists() {
                errors.push(format!("[{}] file entry path does not exist: {}", rel, e.path));
            }
            for c in &e.checks {
                if !all.contains(c) {
                    errors.push(format!("[{}] <check> id '{}' (in {}) does not resolve", rel, c, e.path));
                }
            }
            match seen_paths.get(&e.path) {
                Some(prev) => warnings.push(format!("duplicate <file> entry for {} (in {} and {})", e.path, rel, prev)),
                None => { seen_paths.insert(e.path.clone(), rel.clone()); }
            }
        }
    }
    let forbid_pct = if n_entries > 0 { (100 * n_forbid + n_entries / 2) / n_entries } else { 0 };
    if forbid_pct > 40 {
        warnings.push(format!("<forbid> density is {}% of entries - scarcity preserves salience", forbid_pct));
    }
    let ok = errors.is_empty();
    if json {
        let j = |v: &[String]| v.iter().map(|s| format!("\"{}\"", json_escape(s))).collect::<Vec<_>>().join(",");
        println!(
            "{{\"ok\":{},\"genomes\":{},\"rules\":{},\"fileEntries\":{},\"errors\":[{}],\"warnings\":[{}]}}",
            ok, genomes.len(), all.len(), n_entries, j(&errors), j(&warnings)
        );
    } else {
        for w in &warnings { println!("  warning: {}", w); }
        for e in &errors { println!("  error:   {}", e); }
        println!(
            "\naigx lint: {} genome(s), {} rules, {} file entries -> {} ({} error(s), {} warning(s))",
            genomes.len(), all.len(), n_entries,
            if ok { "ok" } else { "FAIL" }, errors.len(), warnings.len()
        );
    }
    if ok { 0 } else { 1 }
}

fn cmd_resolve(root: &Path, target: &str, ig: &[String]) -> i32 {
    let t = posix(target);
    let t = t.trim_start_matches("./");
    let (genomes, _) = gather(root, ig);
    for g in &genomes {
        for e in &g.entries {
            if posix(&e.path) == t {
                println!("Applicable genome: {}", g.rel);
                if let Some(r) = &e.role { println!("Role:   {}", r); }
                if let Some(f) = &e.forbid {
                    let p = f.pri.as_ref().map(|p| format!("  [{}]", p)).unwrap_or_default();
                    println!("Forbid: {}{}", f.text, p);
                }
                if let Some(go) = &e.gotcha { println!("Gotcha: {}", go.text); }
                if !e.checks.is_empty() { println!("Checks: {}", e.checks.join(", ")); }
                return 0;
            }
        }
    }
    let exists = root.join(t).exists();
    println!("aigx resolve: no <file> entry for '{}'{}", t,
             if exists { "" } else { " (and the file does not exist)" });
    if exists { 0 } else { 2 }
}

fn cmd_init(cwd: &Path, force: bool) -> i32 {
    let dir = cwd.join(".aigx");
    let _ = fs::create_dir_all(&dir);
    let files = [
        ("protocol.aigx", T_PROTOCOL),
        ("architecture.aigx", T_ARCH),
        ("files.aigx", T_FILES),
    ];
    let mut made = vec![];
    for (n, body) in files {
        let p = dir.join(n);
        if p.exists() && !force { continue; }
        if fs::write(&p, body).is_ok() { made.push(n); }
    }
    println!("aigx init: scaffolded .aigx/ ({} file(s))", made.len());
    for n in &made { println!("  + .aigx/{}", n); }
    println!("Next: fill in .aigx/files.aigx, then run `aigx lint`.");
    0
}

fn help() {
    println!(
        "aigx v{}  - AI Genome Exchange CLI (spec {})\n\n\
         Usage: aigx <command> [options]\n\n\
         Commands:\n\
         \x20 lint [--root DIR] [--exclude DIR] [--json]   validate genome(s); non-zero exit on errors\n\
         \x20 resolve <path> [--root DIR]                  print one file's boundary (O(1) lookup)\n\
         \x20 init [--force]                               scaffold a minimal .aigx/ genome\n\n\
         Global: --root DIR, --exclude DIR (also reads .aigxignore), --version, --help\n\n\
         Spec: https://github.com/Lolner95/AIGX/blob/main/standard/AIGX-1.1.md",
        VERSION, SPEC_VERSION
    );
}

// ── arg parsing ─────────────────────────────────────────────────────────────
fn flag_val(args: &[String], name: &str) -> Option<String> {
    args.iter().position(|a| a == name).and_then(|i| args.get(i + 1).cloned())
}
fn all_flag_vals(args: &[String], name: &str) -> Vec<String> {
    let mut out = vec![];
    let mut i = 0;
    while i < args.len() {
        if args[i] == name {
            if let Some(v) = args.get(i + 1) { out.push(v.clone()); i += 2; continue; }
        }
        i += 1;
    }
    out
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.iter().any(|a| a == "--version" || a == "-v") {
        println!("{}", VERSION);
        return;
    }
    let cmd = args.get(0).map(String::as_str).unwrap_or("");
    if cmd.is_empty() || cmd == "--help" || cmd == "-h" || cmd == "help" {
        help();
        exit(if cmd.is_empty() { 1 } else { 0 });
    }
    let json = args.iter().any(|a| a == "--json");
    let root_arg = flag_val(&args, "--root").unwrap_or_else(|| ".".into());
    let root = fs::canonicalize(&root_arg).unwrap_or_else(|_| PathBuf::from(&root_arg));
    let ignores = load_ignores(&root, &all_flag_vals(&args, "--exclude"));
    let code = match cmd {
        "lint" => cmd_lint(&root, json, &ignores),
        "resolve" => match args.get(1).filter(|a| !a.starts_with('-')) {
            Some(t) => cmd_resolve(&root, t, &ignores),
            None => { eprintln!("usage: aigx resolve <path>"); 2 }
        },
        "init" => {
            let cwd = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            cmd_init(&cwd, args.iter().any(|a| a == "--force"))
        }
        other => { eprintln!("aigx: unknown command: {}\n   run `aigx --help`", other); 2 }
    };
    exit(code);
}

// ── embedded init templates ─────────────────────────────────────────────────
const T_PROTOCOL: &str = r#"<aigx-protocol version="1.1">
  <read-first>Open .aigx/files.aigx and find the &lt;file&gt; entry for EACH file you will edit; obey its &lt;forbid pri="CRIT"&gt; and satisfy every id in its &lt;check&gt; before finishing.</read-first>
  <step n="1">Read the per-concern rule files in .aigx/ that the task touches.</step>
  <step n="2">Read .aigx/files.aigx for the per-file boundaries of files you edit.</step>
  <step n="3">Minimal change, local blast radius; verify each file's &lt;check&gt; ids before declaring done.</step>
</aigx-protocol>
"#;
const T_ARCH: &str = r#"<aigx-architecture>
  <rule id="ARCH-no-deep-imports">TODO: import features only through their public barrel; deep imports are forbidden.</rule>
</aigx-architecture>
"#;
const T_FILES: &str = r#"<aigx-files>
  <file path="TODO/path/to/important_file.ext" domain="TODO-domain">
    <role>TODO: one line — what this file does</role>
    <check>ARCH-no-deep-imports</check>
  </file>
</aigx-files>
"#;
