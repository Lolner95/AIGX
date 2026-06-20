# AIGX for Sublime Text

Syntax highlighting for `.aigx` (AI Genome Exchange) genome files.

## Install

Copy `aigx.sublime-syntax` into a folder under your Sublime packages directory:

- **macOS:** `~/Library/Application Support/Sublime Text/Packages/AIGX/`
- **Windows:** `%APPDATA%\Sublime Text\Packages\AIGX\`
- **Linux:** `~/.config/sublime-text/Packages/AIGX/`

(Open it via **Preferences → Browse Packages…**.) Sublime picks it up immediately; `.aigx` files then
use the **AIGX** syntax.

## What it highlights

Tags (`<aigx-…>`, `<file>`, `<rule>`, `<forbid>`, `<check>`, …), attributes (`id`, `path`, `domain`,
`pri`, …), **rule ids** (`PREFIX-SLUG`) in attribute values and `<check>` bodies, `pri="CRIT"`, XML
comments, and character entities.

## Alternative: the TextMate grammar

`aigx.sublime-syntax` is the native, recommended format. If you prefer, Sublime can also load the
canonical TextMate grammar ([`editors/textmate/aigx.tmLanguage.json`](../textmate/aigx.tmLanguage.json))
after converting it with the **PackageDev** package (*Tools → Developer → New Syntax from… / Convert*).
Both produce the `source.aigx` scope.
