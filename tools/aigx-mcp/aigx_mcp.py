#!/usr/bin/env python3
"""aigx-mcp - minimal MCP stdio bridge for AIGX boundary resolution.

This server exposes one tool, `aigx_resolve`, which returns the same structured JSON as:

  python tools/aigx-lint/aigx_lint.py --resolve <path> --root . --format json

It intentionally stays tiny and dependency-free. The MCP client owns the agent workflow; this bridge only
turns AIGX's constant-cost file boundary lookup into a callable tool.
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

SERVER_NAME = "aigx-mcp"
SERVER_VERSION = "0.1.0"
PROTOCOL_VERSION = "2024-11-05"


def read_message(stdin):
    headers = {}
    while True:
        line = stdin.buffer.readline()
        if not line:
            return None
        line = line.decode("ascii", errors="replace").strip()
        if not line:
            break
        name, _, value = line.partition(":")
        headers[name.lower()] = value.strip()
    length = int(headers.get("content-length", "0"))
    if length <= 0:
        return None
    raw = stdin.buffer.read(length)
    return json.loads(raw.decode("utf-8"))


def write_message(stdout, payload):
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    stdout.buffer.write(f"Content-Length: {len(raw)}\r\n\r\n".encode("ascii"))
    stdout.buffer.write(raw)
    stdout.buffer.flush()


def response(message_id, result):
    return {"jsonrpc": "2.0", "id": message_id, "result": result}


def error_response(message_id, code, message):
    return {"jsonrpc": "2.0", "id": message_id, "error": {"code": code, "message": message}}


def tool_definition():
    return {
        "name": "aigx_resolve",
        "description": (
            "Return the AIGX boundary entry for a repo-relative file path: role, forbid, gotcha, "
            "check ids, and original <file> block."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Repo-relative path of the file about to be edited.",
                }
            },
            "required": ["path"],
        },
    }


def resolve_boundary(root, path):
    lint_path = Path(__file__).resolve().parents[1] / "aigx-lint" / "aigx_lint.py"
    proc = subprocess.run(
        [sys.executable, str(lint_path), "--resolve", path, "--root", root, "--format", "json"],
        capture_output=True,
        text=True,
    )
    text = proc.stdout.strip() or proc.stderr.strip()
    try:
        payload = json.loads(text) if text else {}
    except json.JSONDecodeError:
        payload = {"found": False, "path": path, "message": text}
    return proc.returncode, payload


def handle(message, root):
    method = message.get("method")
    message_id = message.get("id")

    if method == "initialize":
        return response(message_id, {
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {"tools": {}},
            "serverInfo": {"name": SERVER_NAME, "version": SERVER_VERSION},
        })

    if method == "notifications/initialized":
        return None

    if method == "tools/list":
        return response(message_id, {"tools": [tool_definition()]})

    if method == "tools/call":
        params = message.get("params") or {}
        name = params.get("name")
        args = params.get("arguments") or {}
        if name != "aigx_resolve":
            return error_response(message_id, -32602, f"unknown tool: {name}")
        path = args.get("path")
        if not isinstance(path, str) or not path:
            return error_response(message_id, -32602, "aigx_resolve requires a non-empty string path")
        code, payload = resolve_boundary(root, path)
        return response(message_id, {
            "content": [{"type": "text", "text": json.dumps(payload, indent=2, sort_keys=True)}],
            "isError": code != 0,
        })

    if message_id is None:
        return None
    return error_response(message_id, -32601, f"method not found: {method}")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Expose AIGX boundary resolution as an MCP stdio tool.")
    parser.add_argument("--root", default=".", help="repository root to resolve paths against")
    args = parser.parse_args(argv)
    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print(f"aigx-mcp: not a directory: {root}", file=sys.stderr)
        return 2

    while True:
        message = read_message(sys.stdin)
        if message is None:
            break
        outgoing = handle(message, root)
        if outgoing is not None:
            write_message(sys.stdout, outgoing)
    return 0


if __name__ == "__main__":
    sys.exit(main())
