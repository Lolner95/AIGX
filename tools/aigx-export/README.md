# aigx-export

Safe reference serializer for AIGX export models.

This tool exists to make export corruption fail loudly before a `.aigx` or Markdown artifact reaches an
MCP client, OpenClaw-style handoff, clipboard, or disk.

## Guarantees

- No implicit object stringification.
- No `[object Object]` or `[object Promise]` output.
- No unresolved `undefined`, `NaN`, invalid dates, or broken structural sentinels.
- Explicit renderers for paragraphs, headings, lists, code blocks, XML fragments, and tables.
- Output validation before write.
- Atomic file write via temp file plus rename.
- Disk readback SHA-256 verification.

## Usage

```bash
python tools/aigx-export/aigx_export.py model.json --format aigx --output brain.aigx
python tools/aigx-export/aigx_export.py model.json --format markdown --output brain.md
```

Input is a JSON render model:

```json
{
  "title": "AIGX Brain",
  "metadata": { "version": "1" },
  "sections": [
    {
      "title": "Phase 7: ATLAS",
      "blocks": [
        { "kind": "paragraph", "text": "Content is explicit." },
        { "kind": "list", "items": ["one", "two"] }
      ]
    }
  ]
}
```

Malformed render values fail with paths such as:

```text
AIGX_EXPORT_INVALID_RENDER_VALUE at document.sections[0].title: expected string, got dict {text}
```

## Handoff Guard

Use `guard_handoff_payload(output, format)` before sending generated text to an MCP/OpenClaw/LLM consumer.
It validates corruption sentinels and structural completeness and returns byte length plus SHA-256.
