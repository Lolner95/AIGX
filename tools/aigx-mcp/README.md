# aigx-mcp

Minimal, zero-dependency MCP stdio bridge for AIGX.

It exposes one tool:

```text
aigx_resolve(path: string)
```

The tool returns the JSON form of a file's AIGX boundary entry:

```bash
python tools/aigx-lint/aigx_lint.py --resolve <path> --root . --format json
```

Use it when an MCP client should hydrate an agent with the binding AIGX context for a file before the
agent edits that file.

## Run

```bash
python tools/aigx-mcp/aigx_mcp.py --root /path/to/your/repo
```

Example MCP client config:

```json
{
  "mcpServers": {
    "aigx": {
      "command": "python",
      "args": ["tools/aigx-mcp/aigx_mcp.py", "--root", "."]
    }
  }
}
```

## Pairing With Code Graph Memory

A code graph memory server is excellent for callers, imports, route maps, and impact analysis. AIGX is
the binding policy layer for the file being edited. A good MCP client asks both, in this order:

1. `aigx_resolve` for each file that may be edited.
2. Graph memory for only the structural neighbors needed by the task.
3. The agent receives the AIGX boundary first, then graph facts with file references.

Keep `.aigx/` sparse and hand-authored. Do not store generated graph snapshots in the genome.
